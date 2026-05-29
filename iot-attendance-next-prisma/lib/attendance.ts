import {
  AttendanceEventSource,
  AttendanceEventType,
  AttendanceStatus,
  DeviceMode,
  EmployeeStatus,
  Prisma,
  UserRole
} from "@prisma/client";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { evaluateTimesheet, shouldTrackAttendanceForDate } from "@/lib/attendance-policy";
import { sendLateCheckInEmail } from "@/lib/email";
import {
  createUnknownCardAlert,
  detectEventAnomalies,
  detectTimesheetAnomalies,
  syncTimesheetLeaveState
} from "@/lib/operations";
import { prisma } from "@/lib/prisma";

const DUPLICATE_TAP_WINDOW_MS = 90_000;
const MIN_CHECKOUT_GAP_MS = 5 * 60_000;
const HISTORY_LOOKBACK_DAYS = 2;

type AttendanceTapInput = {
  uid: string;
  deviceCode: string;
  occurredAt?: Date;
  rawPayload?: Prisma.InputJsonValue;
  firmwareVersion?: string;
  ipAddress?: string;
  signalStrength?: number;
  bootedAt?: Date;
  syncBatchId?: string;
  idempotencyKey?: string;
  source?: AttendanceEventSource;
};

type AttendanceResult = {
  ok: boolean;
  httpStatus: number;
  code:
    | "CHECK_IN_RECORDED"
    | "CHECK_OUT_RECORDED"
    | "DUPLICATE_TAP"
    | "ALREADY_CHECKED_IN"
    | "MISSING_CHECK_IN"
    | "UNKNOWN_CARD";
  action?: AttendanceEventType;
  eventId?: string;
  createdEvent: boolean;
  employee?: {
    id: string;
    employeeNo: string;
    name: string;
  };
  uid: string;
  message: string;
};

function toEmployeeSummary(employee: { id: string; employeeNo: string; firstName: string; lastName: string }) {
  return {
    id: employee.id,
    employeeNo: employee.employeeNo,
    name: `${employee.firstName} ${employee.lastName}`
  };
}

function successResult(
  code: AttendanceResult["code"],
  employee: { id: string; employeeNo: string; firstName: string; lastName: string },
  uid: string,
  message: string,
  options?: { action?: AttendanceEventType; eventId?: string; createdEvent?: boolean }
): AttendanceResult {
  return {
    ok: true,
    httpStatus: 200,
    code,
    action: options?.action,
    eventId: options?.eventId,
    createdEvent: options?.createdEvent ?? false,
    employee: toEmployeeSummary(employee),
    uid,
    message
  };
}

function failureResult(code: AttendanceResult["code"], uid: string, message: string, httpStatus: number): AttendanceResult {
  return {
    ok: false,
    httpStatus,
    code,
    createdEvent: false,
    uid,
    message
  };
}

async function syncDeviceTelemetry(input: AttendanceTapInput, occurredAt: Date) {
  const payload = input.rawPayload ?? Prisma.JsonNull;
  return prisma.device.upsert({
    where: { deviceCode: input.deviceCode },
    update: {
      lastSeenAt: occurredAt,
      lastSyncAt: occurredAt,
      firmwareVersion: input.firmwareVersion ?? undefined,
      lastIpAddress: input.ipAddress ?? undefined,
      lastRssi: input.signalStrength ?? undefined,
      lastBootAt: input.bootedAt ?? undefined,
      lastPayload: payload,
      lastErrorAt: null,
      lastErrorMessage: null
    },
    create: {
      deviceCode: input.deviceCode,
      name: input.deviceCode,
      lastSeenAt: occurredAt,
      lastSyncAt: occurredAt,
      firmwareVersion: input.firmwareVersion ?? null,
      lastIpAddress: input.ipAddress ?? null,
      lastRssi: input.signalStrength ?? null,
      lastBootAt: input.bootedAt ?? null,
      lastPayload: payload
    }
  });
}

async function recordDeviceError(deviceCode: string, occurredAt: Date, message: string, rawPayload?: Prisma.InputJsonValue) {
  await prisma.device.updateMany({
    where: { deviceCode },
    data: {
      lastSeenAt: occurredAt,
      lastErrorAt: occurredAt,
      lastErrorMessage: message,
      lastPayload: rawPayload ?? Prisma.JsonNull
    }
  });
}

async function getRecentEvents(employeeId: string, occurredAt: Date) {
  return prisma.attendanceEvent.findMany({
    where: {
      employeeId,
      occurredAt: {
        gte: startOfDay(subDays(occurredAt, HISTORY_LOOKBACK_DAYS)),
        lte: occurredAt
      }
    },
    orderBy: { occurredAt: "desc" },
    take: 6
  });
}

function findOpenCheckIn(events: Array<{ type: AttendanceEventType; occurredAt: Date }>) {
  let pendingCheckout = 0;

  for (const event of events) {
    if (event.type === AttendanceEventType.CHECK_OUT) {
      pendingCheckout += 1;
      continue;
    }

    if (pendingCheckout === 0) return event;
    pendingCheckout -= 1;
  }

  return null;
}

function determineAction(
  deviceMode: DeviceMode,
  occurredAt: Date,
  recentEvents: Array<{ type: AttendanceEventType; occurredAt: Date }>
) {
  const latestEvent = recentEvents[0] ?? null;
  const openCheckIn = findOpenCheckIn(recentEvents);

  if (deviceMode === DeviceMode.ENTRY_ONLY) {
    if (openCheckIn) {
      const ageMs = occurredAt.getTime() - openCheckIn.occurredAt.getTime();
      if (ageMs <= DUPLICATE_TAP_WINDOW_MS) return { kind: "duplicate" as const };
      return { kind: "invalid" as const, code: "ALREADY_CHECKED_IN" as const, message: "Employee is already checked in" };
    }
    return { kind: "create" as const, type: AttendanceEventType.CHECK_IN };
  }

  if (deviceMode === DeviceMode.EXIT_ONLY) {
    if (!openCheckIn) {
      if (latestEvent && occurredAt.getTime() - latestEvent.occurredAt.getTime() <= DUPLICATE_TAP_WINDOW_MS) {
        return { kind: "duplicate" as const };
      }
      return { kind: "invalid" as const, code: "MISSING_CHECK_IN" as const, message: "No open check-in found for checkout" };
    }

    if (occurredAt.getTime() - openCheckIn.occurredAt.getTime() <= DUPLICATE_TAP_WINDOW_MS) {
      return { kind: "duplicate" as const };
    }
    return { kind: "create" as const, type: AttendanceEventType.CHECK_OUT };
  }

  if (!latestEvent) {
    return { kind: "create" as const, type: AttendanceEventType.CHECK_IN };
  }

  const latestAgeMs = occurredAt.getTime() - latestEvent.occurredAt.getTime();
  if (latestAgeMs <= DUPLICATE_TAP_WINDOW_MS) {
    return { kind: "duplicate" as const };
  }

  if (openCheckIn) {
    const openAgeMs = occurredAt.getTime() - openCheckIn.occurredAt.getTime();
    if (openAgeMs < MIN_CHECKOUT_GAP_MS) {
      return { kind: "duplicate" as const };
    }
    return { kind: "create" as const, type: AttendanceEventType.CHECK_OUT };
  }

  return { kind: "create" as const, type: AttendanceEventType.CHECK_IN };
}

export async function handleIotAttendanceTap(input: AttendanceTapInput): Promise<AttendanceResult> {
  const occurredAt = input.occurredAt ?? new Date();
  const uid = input.uid.trim().toUpperCase();
  const source = input.source ?? AttendanceEventSource.LIVE;

  const device = await syncDeviceTelemetry({ ...input, uid, source }, occurredAt);

  const employee = await prisma.employee.findUnique({
    where: { rfidUid: uid },
    include: { shift: true }
  });

  if (!employee || employee.status !== EmployeeStatus.ACTIVE) {
    await recordDeviceError(device.deviceCode, occurredAt, "Unknown or inactive card scanned", input.rawPayload);
    await createUnknownCardAlert({
      uid,
      deviceId: device.id,
      deviceCode: device.deviceCode,
      occurredAt
    });
    return failureResult("UNKNOWN_CARD", uid, "Unknown or inactive card", 404);
  }

  const recentEvents = await getRecentEvents(employee.id, occurredAt);
  const latestEvent = recentEvents[0] ?? null;

  if (input.idempotencyKey) {
    const existing = await prisma.attendanceEvent.findFirst({
      where: { idempotencyKey: input.idempotencyKey },
      include: { employee: true }
    });

    if (existing) {
      return successResult(
        existing.type === AttendanceEventType.CHECK_IN ? "CHECK_IN_RECORDED" : "CHECK_OUT_RECORDED",
        existing.employee,
        uid,
        existing.type === AttendanceEventType.CHECK_IN ? "Check-in already recorded" : "Check-out already recorded",
        { action: existing.type, eventId: existing.id, createdEvent: false }
      );
    }
  }

  const decision = determineAction(device.mode, occurredAt, recentEvents);

  if (decision.kind === "duplicate") {
    return successResult(
      "DUPLICATE_TAP",
      employee,
      uid,
      latestEvent?.type === AttendanceEventType.CHECK_IN ? "Duplicate tap ignored after check-in" : "Duplicate tap ignored",
      { action: latestEvent?.type, eventId: latestEvent?.id, createdEvent: false }
    );
  }

  if (decision.kind === "invalid") {
    return successResult(decision.code, employee, uid, decision.message, { createdEvent: false });
  }

  const event = await prisma.attendanceEvent.create({
    data: {
      employeeId: employee.id,
      deviceId: device.id,
      type: decision.type,
      source,
      occurredAt,
      rfidUid: uid,
      idempotencyKey: input.idempotencyKey ?? null,
      syncBatchId: input.syncBatchId ?? null,
      rawPayload: input.rawPayload ?? Prisma.JsonNull
    }
  });

  await recalculateTimesheet(employee.id, occurredAt);
  await detectEventAnomalies(event.id);

  if (decision.type === AttendanceEventType.CHECK_IN) {
    void dispatchLateCheckInEmail(employee.id, occurredAt);
  }

  return successResult(
    decision.type === AttendanceEventType.CHECK_IN ? "CHECK_IN_RECORDED" : "CHECK_OUT_RECORDED",
    employee,
    uid,
    decision.type === AttendanceEventType.CHECK_IN ? "Checked in" : "Checked out",
    { action: decision.type, eventId: event.id, createdEvent: true }
  );
}

async function dispatchLateCheckInEmail(employeeId: string, checkInTime: Date) {
  try {
    const [timesheet, supervisors] = await Promise.all([
      prisma.timesheet.findUnique({
        where: { employeeId_date: { employeeId, date: startOfDay(checkInTime) } },
        include: { employee: { include: { shift: true, department: true } } }
      }),
      prisma.user.findMany({
        where: { role: { in: [UserRole.MANAGER, UserRole.HR_ADMIN, UserRole.SUPER_ADMIN] } },
        select: { email: true }
      })
    ]);

    if (!timesheet || timesheet.status !== AttendanceStatus.LATE || timesheet.lateMinutes <= 0) return;

    await sendLateCheckInEmail({
      employeeName: `${timesheet.employee.firstName} ${timesheet.employee.lastName}`,
      employeeNo: timesheet.employee.employeeNo,
      employeeEmail: timesheet.employee.email ?? null,
      department: timesheet.employee.department?.name ?? "Unassigned",
      shiftName: timesheet.employee.shift?.name ?? "Default",
      shiftStart: timesheet.employee.shift?.startTime ?? "N/A",
      checkInTime,
      lateMinutes: timesheet.lateMinutes,
      supervisorEmails: supervisors.map((u) => u.email)
    });
  } catch (err) {
    console.error("[attendance] Failed to send late check-in email:", err);
  }
}

export async function recalculateTimesheet(employeeId: string, date: Date) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { shift: true } });
  if (!employee) return;

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const shouldTrack = shouldTrackAttendanceForDate(employee.shift, dayStart);

  const events = await prisma.attendanceEvent.findMany({
    where: { employeeId, occurredAt: { gte: dayStart, lte: dayEnd } },
    orderBy: { occurredAt: "asc" }
  });

  const checkIns = events.filter((event) => event.type === AttendanceEventType.CHECK_IN);
  const checkOuts = events.filter((event) => event.type === AttendanceEventType.CHECK_OUT);
  const firstCheckIn = checkIns[0]?.occurredAt ?? null;
  const lastCheckOut = checkOuts[checkOuts.length - 1]?.occurredAt ?? null;

  if (!firstCheckIn) {
    const leave = await syncTimesheetLeaveState(employeeId, date);
    if (leave) {
      await detectTimesheetAnomalies(employeeId, date);
      return;
    }
  }

  const evaluation = evaluateTimesheet(employee.shift, dayStart, firstCheckIn, lastCheckOut);
  let status = evaluation.status;
  let notes = evaluation.notes;

  if (!shouldTrack && !firstCheckIn) {
    notes = "Weekend attendance not required for this shift";
  } else if (!shouldTrack && firstCheckIn) {
    notes = "Weekend attendance recorded under exception policy";
  }

  await prisma.timesheet.upsert({
    where: { employeeId_date: { employeeId, date: dayStart } },
    update: {
      firstCheckIn,
      lastCheckOut,
      workedMinutes: evaluation.workedMinutes,
      lateMinutes: evaluation.lateMinutes,
      status,
      notes
    },
    create: {
      employeeId,
      date: dayStart,
      firstCheckIn,
      lastCheckOut,
      workedMinutes: evaluation.workedMinutes,
      lateMinutes: evaluation.lateMinutes,
      status,
      notes
    }
  });

  await detectTimesheetAnomalies(employeeId, date);
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function formatDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}
