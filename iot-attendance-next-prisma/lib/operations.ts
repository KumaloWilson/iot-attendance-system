import {
  AnomalyType,
  AttendanceEventType,
  AttendanceStatus,
  CorrectionRequestStatus,
  LeaveRequestStatus,
  NotificationSeverity,
  NotificationStatus,
  Prisma
} from "@prisma/client";
import { endOfDay, isWeekend, isWithinInterval, startOfDay, subDays } from "date-fns";
import { evaluateTimesheet, parseTimeForDate } from "@/lib/attendance-policy";
import { prisma } from "@/lib/prisma";

type JsonDetails = Record<string, unknown>;

function sameDay(date: Date) {
  return {
    gte: startOfDay(date),
    lte: endOfDay(date)
  };
}

async function createAnomalyWithNotification(input: {
  type: AnomalyType;
  title: string;
  description: string;
  employeeId?: string | null;
  deviceId?: string | null;
  eventId?: string | null;
  severity?: NotificationSeverity;
  metadata?: JsonDetails;
  dedupeKey?: string;
}) {
  const dedupeWindowStart = subDays(new Date(), 2);
  const existing = await prisma.attendanceAnomaly.findFirst({
    where: {
      type: input.type,
      employeeId: input.employeeId ?? null,
      deviceId: input.deviceId ?? null,
      resolvedAt: null,
      detectedAt: { gte: dedupeWindowStart },
      ...(input.dedupeKey
        ? {
            metadata: {
              path: ["dedupeKey"],
              equals: input.dedupeKey
            }
          }
        : {})
    },
    include: { notification: true }
  });

  if (existing) return existing;

  return prisma.attendanceAnomaly.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description,
      employeeId: input.employeeId ?? null,
      deviceId: input.deviceId ?? null,
      eventId: input.eventId ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.dedupeKey ? { dedupeKey: input.dedupeKey } : {})
      } as Prisma.InputJsonValue,
      notification: {
        create: {
          title: input.title,
          message: input.description,
          severity: input.severity ?? NotificationSeverity.WARNING,
          status: NotificationStatus.OPEN,
          employeeId: input.employeeId ?? null,
          deviceId: input.deviceId ?? null,
          metadata: input.metadata as Prisma.InputJsonValue | undefined
        }
      }
    },
    include: { notification: true }
  });
}

async function resolveAnomaly(type: AnomalyType, dedupeKey: string) {
  const anomaly = await prisma.attendanceAnomaly.findFirst({
    where: {
      type,
      resolvedAt: null,
      metadata: {
        path: ["dedupeKey"],
        equals: dedupeKey
      }
    },
    include: { notification: true }
  });

  if (!anomaly) return null;

  await prisma.attendanceAnomaly.update({
    where: { id: anomaly.id },
    data: { resolvedAt: new Date() }
  });

  if (anomaly.notification) {
    await prisma.notification.update({
      where: { id: anomaly.notification.id },
      data: { status: NotificationStatus.RESOLVED, resolvedAt: new Date() }
    });
  }

  return anomaly;
}

export async function isEmployeeOnApprovedLeave(employeeId: string, date: Date) {
  const leave = await prisma.leaveRequest.findFirst({
    where: {
      employeeId,
      status: LeaveRequestStatus.APPROVED,
      startDate: { lte: endOfDay(date) },
      endDate: { gte: startOfDay(date) }
    }
  });

  return leave;
}

export async function syncTimesheetLeaveState(employeeId: string, date: Date) {
  const leave = await isEmployeeOnApprovedLeave(employeeId, date);
  if (!leave) return null;

  const existing = await prisma.timesheet.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay(date) } }
  });

  if (existing?.firstCheckIn || existing?.lastCheckOut) return leave;

  await prisma.timesheet.upsert({
    where: { employeeId_date: { employeeId, date: startOfDay(date) } },
    update: {
      status: AttendanceStatus.ON_LEAVE,
      workedMinutes: 0,
      lateMinutes: 0,
      notes: `${leave.type} leave approved`
    },
    create: {
      employeeId,
      date: startOfDay(date),
      status: AttendanceStatus.ON_LEAVE,
      workedMinutes: 0,
      lateMinutes: 0,
      notes: `${leave.type} leave approved`
    }
  });

  return leave;
}

export async function syncDeviceOfflineAlerts() {
  const now = Date.now();
  const devices = await prisma.device.findMany({ where: { isActive: true } });

  for (const device of devices) {
    const ageMs = device.lastSeenAt ? now - device.lastSeenAt.getTime() : Number.POSITIVE_INFINITY;
    if (ageMs < 30 * 60_000) continue;

    await createAnomalyWithNotification({
      type: AnomalyType.DEVICE_OFFLINE,
      title: `${device.name} offline`,
      description: `${device.deviceCode} has not reported recently and needs attention.`,
      deviceId: device.id,
      severity: NotificationSeverity.CRITICAL,
      metadata: { lastSeenAt: device.lastSeenAt?.toISOString() ?? null },
      dedupeKey: `offline:${device.id}`
    });
  }
}

export async function detectTimesheetAnomalies(employeeId: string, date: Date) {
  const timesheet = await prisma.timesheet.findUnique({
    where: { employeeId_date: { employeeId, date: startOfDay(date) } },
    include: { employee: { include: { shift: true } } }
  });
  if (!timesheet) return;

  const missedCheckoutKey = `missed-checkout:${employeeId}:${startOfDay(date).toISOString()}`;

  if (timesheet.firstCheckIn && !timesheet.lastCheckOut) {
    const graceMinutes = timesheet.employee.shift?.missedCheckoutGraceMinutes ?? 180;
    const openMinutes = Math.max(0, Math.round((Date.now() - timesheet.firstCheckIn.getTime()) / 60_000));
    if (openMinutes >= graceMinutes) {
      await createAnomalyWithNotification({
        type: AnomalyType.MISSED_CHECKOUT,
        title: `${timesheet.employee.firstName} missing checkout`,
        description: `${timesheet.employee.firstName} ${timesheet.employee.lastName} has an open attendance session beyond the ${graceMinutes}-minute policy.`,
        employeeId,
        severity: NotificationSeverity.WARNING,
        metadata: { date: startOfDay(date).toISOString(), openMinutes, graceMinutes },
        dedupeKey: missedCheckoutKey
      });
    }
  } else {
    await resolveAnomaly(AnomalyType.MISSED_CHECKOUT, missedCheckoutKey);
  }

  const excessiveLateThreshold = Math.max(30, (timesheet.employee.shift?.graceMinutes ?? 15) * 2);
  if (timesheet.lateMinutes >= excessiveLateThreshold) {
    await createAnomalyWithNotification({
      type: AnomalyType.EXCESSIVE_LATENESS,
      title: `${timesheet.employee.firstName} excessively late`,
      description: `${timesheet.employee.firstName} ${timesheet.employee.lastName} arrived ${timesheet.lateMinutes} minutes late.`,
      employeeId,
      severity: NotificationSeverity.WARNING,
      metadata: {
        date: startOfDay(date).toISOString(),
        lateMinutes: timesheet.lateMinutes,
        thresholdMinutes: excessiveLateThreshold
      },
      dedupeKey: `late:${employeeId}:${startOfDay(date).toISOString()}`
    });
  } else {
    await resolveAnomaly(AnomalyType.EXCESSIVE_LATENESS, `late:${employeeId}:${startOfDay(date).toISOString()}`);
  }
}

export async function detectEventAnomalies(eventId: string) {
  const event = await prisma.attendanceEvent.findUnique({
    where: { id: eventId },
    include: { employee: { include: { shift: true } }, device: true }
  });
  if (!event) return;

  if (event.employee.shift) {
    const shiftStart = parseTimeForDate(event.occurredAt, event.employee.shift.startTime);
    const shiftEnd = parseTimeForDate(event.occurredAt, event.employee.shift.endTime);
    const windowStart = new Date(shiftStart.getTime() - Math.max(30, event.employee.shift.graceMinutes) * 60_000);
    const windowEnd = new Date(shiftEnd.getTime() + event.employee.shift.missedCheckoutGraceMinutes * 60_000);
    const outsideWeekendPolicy = isWeekend(event.occurredAt) && !event.employee.shift.weekendAttendanceEnabled;

    if (outsideWeekendPolicy || !isWithinInterval(event.occurredAt, { start: windowStart, end: windowEnd })) {
      await createAnomalyWithNotification({
        type: AnomalyType.OUT_OF_SHIFT,
        title: `${event.employee.firstName} scanned outside shift hours`,
        description: outsideWeekendPolicy
          ? `${event.employee.firstName} ${event.employee.lastName} scanned during a weekend on a shift that does not require weekend attendance.`
          : `${event.employee.firstName} ${event.employee.lastName} scanned at ${event.occurredAt.toLocaleTimeString()} outside the expected policy window.`,
        employeeId: event.employeeId,
        deviceId: event.deviceId,
        eventId: event.id,
        severity: NotificationSeverity.INFO,
        metadata: {
          occurredAt: event.occurredAt.toISOString(),
          expectedStart: shiftStart.toISOString(),
          expectedEnd: shiftEnd.toISOString()
        },
        dedupeKey: `outside-shift:${event.id}`
      });
    }
  }

  const recentPriorEvent = await prisma.attendanceEvent.findFirst({
    where: {
      employeeId: event.employeeId,
      id: { not: event.id },
      occurredAt: {
        gte: new Date(event.occurredAt.getTime() - 10 * 60_000),
        lte: event.occurredAt
      }
    },
    orderBy: { occurredAt: "desc" }
  });

  if (
    recentPriorEvent &&
    recentPriorEvent.type === AttendanceEventType.CHECK_OUT &&
    event.type === AttendanceEventType.CHECK_IN
  ) {
    await createAnomalyWithNotification({
      type: AnomalyType.RAPID_REENTRY,
      title: `${event.employee.firstName} rapidly re-entered`,
      description: `${event.employee.firstName} ${event.employee.lastName} checked back in within minutes of a checkout.`,
      employeeId: event.employeeId,
      deviceId: event.deviceId,
      eventId: event.id,
      severity: NotificationSeverity.INFO,
      metadata: { previousEventId: recentPriorEvent.id, occurredAt: event.occurredAt.toISOString() },
      dedupeKey: `rapid-reentry:${recentPriorEvent.id}:${event.id}`
    });
  }

  const nearbyOtherDevice = await prisma.attendanceEvent.findFirst({
    where: {
      employeeId: event.employeeId,
      id: { not: event.id },
      deviceId: { not: event.deviceId ?? undefined },
      occurredAt: {
        gte: new Date(event.occurredAt.getTime() - 3 * 60_000),
        lte: new Date(event.occurredAt.getTime() + 3 * 60_000)
      }
    }
  });

  if (nearbyOtherDevice) {
    await createAnomalyWithNotification({
      type: AnomalyType.MULTI_DEVICE_CONFLICT,
      title: `${event.employee.firstName} scanned across multiple terminals`,
      description: "The same card was recorded on different devices within a short period.",
      employeeId: event.employeeId,
      deviceId: event.deviceId,
      eventId: event.id,
      severity: NotificationSeverity.WARNING,
      metadata: { conflictingEventId: nearbyOtherDevice.id },
      dedupeKey: `multi-device:${event.id}:${nearbyOtherDevice.id}`
    });
  }
}

export async function createUnknownCardAlert(input: {
  uid: string;
  deviceId?: string | null;
  deviceCode: string;
  occurredAt: Date;
}) {
  await createAnomalyWithNotification({
    type: AnomalyType.UNKNOWN_CARD,
    title: "Unknown card scanned",
    description: `UID ${input.uid} was rejected on ${input.deviceCode}.`,
    deviceId: input.deviceId ?? null,
    severity: NotificationSeverity.WARNING,
    metadata: { uid: input.uid, occurredAt: input.occurredAt.toISOString(), deviceCode: input.deviceCode },
    dedupeKey: `unknown:${input.deviceCode}:${input.uid}:${startOfDay(input.occurredAt).toISOString()}`
  });
}

export async function getOpenNotifications(limit = 20) {
  return prisma.notification.findMany({
    where: { status: NotificationStatus.OPEN },
    include: {
      employee: true,
      device: true,
      anomaly: true
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    take: limit
  });
}

export async function updateNotificationStatus(notificationId: string, status: NotificationStatus) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: {
      status,
      resolvedAt: status === NotificationStatus.RESOLVED ? new Date() : null
    }
  });
}

export async function applyApprovedCorrection(correctionId: string, reviewerId?: string | null, reviewNotes?: string | null) {
  const correction = await prisma.attendanceCorrection.findUnique({
    where: { id: correctionId },
    include: {
      employee: {
        include: { shift: true }
      }
    }
  });
  if (!correction) return null;

  const day = startOfDay(correction.date);
  const evaluation = evaluateTimesheet(
    correction.employee.shift,
    day,
    correction.requestedCheckIn,
    correction.requestedCheckOut
  );

  const timesheet = await prisma.timesheet.upsert({
    where: { employeeId_date: { employeeId: correction.employeeId, date: day } },
    update: {
      firstCheckIn: correction.requestedCheckIn ?? null,
      lastCheckOut: correction.requestedCheckOut ?? null,
      workedMinutes: evaluation.workedMinutes,
      lateMinutes: evaluation.lateMinutes,
      status: evaluation.status,
      notes: `Correction applied: ${correction.reason}`
    },
    create: {
      employeeId: correction.employeeId,
      date: day,
      firstCheckIn: correction.requestedCheckIn ?? null,
      lastCheckOut: correction.requestedCheckOut ?? null,
      workedMinutes: evaluation.workedMinutes,
      lateMinutes: evaluation.lateMinutes,
      status: evaluation.status,
      notes: `Correction applied: ${correction.reason}`
    }
  });

  await prisma.attendanceEvent.createMany({
    data: [
      correction.requestedCheckIn
        ? {
            employeeId: correction.employeeId,
            type: AttendanceEventType.CHECK_IN,
            source: "OFFLINE_SYNC",
            occurredAt: correction.requestedCheckIn,
            rfidUid: correction.employee.rfidUid,
            rawPayload: { correctionId, manuallyAdjusted: true, action: "CHECK_IN" } as Prisma.InputJsonValue
          }
        : null,
      correction.requestedCheckOut
        ? {
            employeeId: correction.employeeId,
            type: AttendanceEventType.CHECK_OUT,
            source: "OFFLINE_SYNC",
            occurredAt: correction.requestedCheckOut,
            rfidUid: correction.employee.rfidUid,
            rawPayload: { correctionId, manuallyAdjusted: true, action: "CHECK_OUT" } as Prisma.InputJsonValue
          }
        : null
    ].filter(Boolean) as Prisma.AttendanceEventCreateManyInput[]
  });

  await prisma.attendanceCorrection.update({
    where: { id: correctionId },
    data: {
      status: CorrectionRequestStatus.APPLIED,
      reviewedByUserId: reviewerId ?? correction.reviewedByUserId,
      reviewedAt: new Date(),
      appliedAt: new Date(),
      reviewNotes: reviewNotes ?? correction.reviewNotes,
      timesheetId: timesheet.id
    }
  });

  return timesheet;
}

export async function getStakeholderSummaries() {
  const [todayTimesheets, openNotifications, pendingLeaves, pendingCorrections] = await Promise.all([
    prisma.timesheet.findMany({
      where: { date: sameDay(new Date()) },
      include: { employee: true }
    }),
    getOpenNotifications(6),
    prisma.leaveRequest.count({ where: { status: LeaveRequestStatus.PENDING } }),
    prisma.attendanceCorrection.count({ where: { status: CorrectionRequestStatus.PENDING } })
  ]);

  return {
    employee: {
      title: "Employee self-service",
      detail: `${todayTimesheets.filter((row) => row.status === AttendanceStatus.PRESENT || row.status === AttendanceStatus.LATE).length} staff members are marked active today.`
    },
    supervisor: {
      title: "Supervisor oversight",
      detail: `${todayTimesheets.filter((row) => row.status === AttendanceStatus.ABSENT).length} absences and ${openNotifications.length} active alerts need review.`
    },
    hr: {
      title: "HR compliance",
      detail: `${pendingLeaves} leave requests and ${pendingCorrections} correction requests are in workflow.`
    },
    admin: {
      title: "Operations command view",
      detail: `${todayTimesheets.filter((row) => row.status === AttendanceStatus.LATE).length} late arrivals and ${openNotifications.length} live alerts are visible to administrators.`
    }
  };
}
