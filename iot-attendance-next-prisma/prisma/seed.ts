import {
  AnomalyType,
  AttendanceEventType,
  AttendanceEventSource,
  CorrectionRequestStatus,
  DeviceMode,
  EnrollmentStatus,
  LeaveRequestStatus,
  LeaveType,
  NotificationSeverity,
  NotificationStatus,
  PrismaClient,
  UserRole,
  type Employee,
  type Shift
} from "@prisma/client";
import { isWeekend, startOfDay, subDays } from "date-fns";
import bcrypt from "bcryptjs";
import { evaluateTimesheet } from "@/lib/attendance-policy";

const prisma = new PrismaClient();

function atTime(date: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildTimesheet(shift: Shift, day: Date, firstCheckIn?: Date | null, lastCheckOut?: Date | null) {
  const evaluation = evaluateTimesheet(shift, day, firstCheckIn, lastCheckOut);
  return {
    date: evaluation.day,
    firstCheckIn: firstCheckIn ?? null,
    lastCheckOut: lastCheckOut ?? null,
    workedMinutes: evaluation.workedMinutes,
    lateMinutes: evaluation.lateMinutes,
    status: evaluation.status,
    notes: evaluation.notes
  };
}

async function main() {
  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const [entranceSecretHash, workshopSecretHash, warehouseSecretHash] = await Promise.all([
    bcrypt.hash("entrance-demo-01", 12),
    bcrypt.hash("workshop-demo-01", 12),
    bcrypt.hash("warehouse-demo-01", 12)
  ]);

  const [operations, hr, security] = await Promise.all([
    prisma.department.upsert({
      where: { name: "Operations" },
      update: {},
      create: { name: "Operations" }
    }),
    prisma.department.upsert({
      where: { name: "Human Resources" },
      update: {},
      create: { name: "Human Resources" }
    }),
    prisma.department.upsert({
      where: { name: "Security" },
      update: {},
      create: { name: "Security" }
    })
  ]);

  const [dayShift, supportShift] = await Promise.all([
    prisma.shift.upsert({
      where: { name: "Day 08:00-17:00" },
      update: {},
      create: {
        name: "Day 08:00-17:00",
        startTime: "08:00",
        endTime: "17:00",
        graceMinutes: 15,
        expectedMinutes: 480,
        halfDayMinutes: 240,
        overtimeAfterMinutes: 540,
        missedCheckoutGraceMinutes: 180,
        weekendAttendanceEnabled: false
      }
    }),
    prisma.shift.upsert({
      where: { name: "Support 09:00-18:00" },
      update: {},
      create: {
        name: "Support 09:00-18:00",
        startTime: "09:00",
        endTime: "18:00",
        graceMinutes: 10,
        expectedMinutes: 480,
        halfDayMinutes: 240,
        overtimeAfterMinutes: 540,
        missedCheckoutGraceMinutes: 180,
        weekendAttendanceEnabled: true
      }
    })
  ]);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash, role: UserRole.SUPER_ADMIN, name: "System Admin" },
    create: {
      name: "System Admin",
      email: "admin@example.com",
      passwordHash,
      role: UserRole.SUPER_ADMIN
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: { passwordHash, role: UserRole.MANAGER, name: "Operations Manager" },
    create: {
      name: "Operations Manager",
      email: "manager@example.com",
      passwordHash,
      role: UserRole.MANAGER
    }
  });

  const hrAdmin = await prisma.user.upsert({
    where: { email: "hr@example.com" },
    update: { passwordHash, role: UserRole.HR_ADMIN, name: "HR Admin" },
    create: {
      name: "HR Admin",
      email: "hr@example.com",
      passwordHash,
      role: UserRole.HR_ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: { passwordHash, role: UserRole.VIEWER, name: "Observer" },
    create: {
      name: "Observer",
      email: "viewer@example.com",
      passwordHash,
      role: UserRole.VIEWER
    }
  });

  const [mainEntrance, workshop, warehouse] = await Promise.all([
    prisma.device.upsert({
      where: { deviceCode: "ENTRANCE-01" },
      update: {
        name: "Main Entrance",
        location: "Reception",
        mode: DeviceMode.ENTRY_EXIT,
        isActive: true,
        secretHash: entranceSecretHash,
        firmwareVersion: "1.3.2"
      },
      create: {
        deviceCode: "ENTRANCE-01",
        name: "Main Entrance",
        location: "Reception",
        mode: DeviceMode.ENTRY_EXIT,
        secretHash: entranceSecretHash,
        firmwareVersion: "1.3.2"
      }
    }),
    prisma.device.upsert({
      where: { deviceCode: "WORKSHOP-01" },
      update: {
        name: "Workshop Gate",
        location: "Operations Floor",
        mode: DeviceMode.ENTRY_ONLY,
        isActive: true,
        secretHash: workshopSecretHash,
        firmwareVersion: "1.2.9"
      },
      create: {
        deviceCode: "WORKSHOP-01",
        name: "Workshop Gate",
        location: "Operations Floor",
        mode: DeviceMode.ENTRY_ONLY,
        secretHash: workshopSecretHash,
        firmwareVersion: "1.2.9"
      }
    }),
    prisma.device.upsert({
      where: { deviceCode: "WAREHOUSE-01" },
      update: {
        name: "Warehouse Door",
        location: "Warehouse",
        mode: DeviceMode.EXIT_ONLY,
        isActive: true,
        secretHash: warehouseSecretHash,
        firmwareVersion: "1.1.7"
      },
      create: {
        deviceCode: "WAREHOUSE-01",
        name: "Warehouse Door",
        location: "Warehouse",
        mode: DeviceMode.EXIT_ONLY,
        secretHash: warehouseSecretHash,
        firmwareVersion: "1.1.7"
      }
    })
  ]);

  const employeeSpecs = [
    {
      employeeNo: "EMP-001",
      firstName: "Wilson",
      lastName: "Kumalo",
      email: "wilson.kumalo@example.com",
      phone: "+263771000001",
      rfidUid: "46 14 33 07",
      departmentId: operations.id,
      shiftId: dayShift.id,
      status: "ACTIVE" as const
    },
    {
      employeeNo: "EMP-002",
      firstName: "Rudo",
      lastName: "Moyo",
      email: "rudo.moyo@example.com",
      phone: "+263771000002",
      rfidUid: "A2 93 FA 06",
      departmentId: hr.id,
      shiftId: dayShift.id,
      status: "ACTIVE" as const
    },
    {
      employeeNo: "EMP-003",
      firstName: "Tendai",
      lastName: "Dube",
      email: "tendai.dube@example.com",
      phone: "+263771000003",
      rfidUid: "4B B4 3A 05",
      departmentId: security.id,
      shiftId: supportShift.id,
      status: "ACTIVE" as const
    },
    {
      employeeNo: "EMP-004",
      firstName: "Memory",
      lastName: "Sibanda",
      email: "memory.sibanda@example.com",
      phone: "+263771000004",
      rfidUid: "D0 77 19 AF",
      departmentId: operations.id,
      shiftId: dayShift.id,
      status: "ACTIVE" as const
    },
    {
      employeeNo: "EMP-005",
      firstName: "Farai",
      lastName: "Chirwa",
      email: "farai.chirwa@example.com",
      phone: "+263771000005",
      rfidUid: "11 92 BC 44",
      departmentId: hr.id,
      shiftId: supportShift.id,
      status: "ACTIVE" as const
    },
    {
      employeeNo: "EMP-006",
      firstName: "Nyasha",
      lastName: "Ncube",
      email: "nyasha.ncube@example.com",
      phone: "+263771000006",
      rfidUid: "2E C8 71 90",
      departmentId: operations.id,
      shiftId: dayShift.id,
      status: "SUSPENDED" as const
    }
  ];

  const employeesByNo = new Map<string, Employee>();

  for (const spec of employeeSpecs) {
    const employee = await prisma.employee.upsert({
      where: { employeeNo: spec.employeeNo },
      update: spec,
      create: spec
    });
    employeesByNo.set(spec.employeeNo, employee);
  }

  await prisma.attendanceEvent.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendanceAnomaly.deleteMany();
  await prisma.attendanceCorrection.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.enrollmentScan.deleteMany();

  const shifts = new Map([
    [dayShift.id, dayShift],
    [supportShift.id, supportShift]
  ]);

  const demoDays: Date[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = startOfDay(subDays(new Date(), offset));
    if (!isWeekend(day)) demoDays.push(day);
  }

  const patterns: Record<string, Array<{ in?: string; out?: string; deviceCode?: string }>> = {
    "EMP-001": [
      { in: "07:58", out: "17:06", deviceCode: "ENTRANCE-01" },
      { in: "08:03", out: "17:04", deviceCode: "ENTRANCE-01" },
      { in: "08:08", out: "17:11", deviceCode: "ENTRANCE-01" },
      { in: "08:04", out: "16:48", deviceCode: "WORKSHOP-01" },
      { in: "07:56", out: "17:02", deviceCode: "WORKSHOP-01" }
    ],
    "EMP-002": [
      { in: "08:22", out: "17:00", deviceCode: "ENTRANCE-01" },
      { in: "08:18", out: "17:14", deviceCode: "ENTRANCE-01" },
      { in: "08:11", out: "16:55", deviceCode: "ENTRANCE-01" },
      { in: "08:40", out: "12:18", deviceCode: "ENTRANCE-01" },
      { deviceCode: "ENTRANCE-01" }
    ],
    "EMP-003": [
      { in: "08:57", out: "18:02", deviceCode: "WAREHOUSE-01" },
      { in: "09:13", out: "18:01", deviceCode: "WAREHOUSE-01" },
      { in: "08:59", out: "17:58", deviceCode: "WAREHOUSE-01" },
      { in: "09:06", out: "17:44", deviceCode: "WAREHOUSE-01" },
      { in: "08:55", out: "18:05", deviceCode: "WAREHOUSE-01" }
    ],
    "EMP-004": [
      { in: "08:00", out: "17:12", deviceCode: "WORKSHOP-01" },
      { deviceCode: "WORKSHOP-01" },
      { in: "08:07", out: "17:09", deviceCode: "WORKSHOP-01" },
      { in: "08:14", out: "17:00", deviceCode: "WORKSHOP-01" },
      { in: "08:02", out: "16:57", deviceCode: "WORKSHOP-01" }
    ],
    "EMP-005": [
      { in: "08:58", out: "18:03", deviceCode: "ENTRANCE-01" },
      { in: "09:02", out: "17:51", deviceCode: "ENTRANCE-01" },
      { in: "09:21", out: "18:04", deviceCode: "ENTRANCE-01" },
      { in: "09:07", out: "18:02", deviceCode: "ENTRANCE-01" },
      { in: "09:00", out: "17:59", deviceCode: "ENTRANCE-01" }
    ]
  };

  const devicesByCode = new Map([
    [mainEntrance.deviceCode, mainEntrance],
    [workshop.deviceCode, workshop],
    [warehouse.deviceCode, warehouse]
  ]);

  for (const [employeeNo, pattern] of Object.entries(patterns)) {
    const employee = employeesByNo.get(employeeNo);
    if (!employee || !employee.shiftId) continue;

    const shift = shifts.get(employee.shiftId);
    if (!shift) continue;

    for (let index = 0; index < demoDays.length; index += 1) {
      const day = demoDays[index];
      const dayPattern = pattern[index];
      if (!dayPattern) continue;

      const firstCheckIn = dayPattern.in ? atTime(day, dayPattern.in) : null;
      const lastCheckOut = dayPattern.out ? atTime(day, dayPattern.out) : null;
      const device = devicesByCode.get(dayPattern.deviceCode ?? "ENTRANCE-01");

      if (firstCheckIn) {
        await prisma.attendanceEvent.create({
          data: {
            employeeId: employee.id,
            deviceId: device?.id ?? null,
            type: AttendanceEventType.CHECK_IN,
            source: AttendanceEventSource.SEEDED,
            occurredAt: firstCheckIn,
            rfidUid: employee.rfidUid,
            rawPayload: { seeded: true, employeeNo, action: "CHECK_IN" }
          }
        });
      }

      if (lastCheckOut) {
        await prisma.attendanceEvent.create({
          data: {
            employeeId: employee.id,
            deviceId: device?.id ?? null,
            type: AttendanceEventType.CHECK_OUT,
            source: AttendanceEventSource.SEEDED,
            occurredAt: lastCheckOut,
            rfidUid: employee.rfidUid,
            rawPayload: { seeded: true, employeeNo, action: "CHECK_OUT" }
          }
        });
      }

      const timesheet = buildTimesheet(shift, day, firstCheckIn, lastCheckOut);
      await prisma.timesheet.create({
        data: {
          employeeId: employee.id,
          ...timesheet,
          notes: "Seeded demo record"
        }
      });
    }
  }

  await prisma.device.update({
    where: { id: mainEntrance.id },
    data: {
      lastSeenAt: new Date(),
      lastSyncAt: new Date(),
      lastBootAt: atTime(demoDays[demoDays.length - 1] ?? new Date(), "07:40"),
      lastIpAddress: "192.168.1.41",
      lastRssi: -55
    }
  });
  await prisma.device.update({
    where: { id: workshop.id },
    data: {
      lastSeenAt: new Date(Date.now() - 12 * 60_000),
      lastSyncAt: new Date(Date.now() - 12 * 60_000),
      lastBootAt: atTime(demoDays[demoDays.length - 1] ?? new Date(), "07:10"),
      lastIpAddress: "192.168.1.42",
      lastRssi: -71
    }
  });
  await prisma.device.update({
    where: { id: warehouse.id },
    data: {
      lastSeenAt: new Date(Date.now() - 2 * 60 * 60_000),
      lastSyncAt: new Date(Date.now() - 2 * 60 * 60_000),
      lastBootAt: atTime(demoDays[demoDays.length - 1] ?? new Date(), "06:55"),
      lastIpAddress: "192.168.1.43",
      lastRssi: -84,
      lastErrorAt: new Date(Date.now() - 95 * 60_000),
      lastErrorMessage: "No heartbeat received from controller"
    }
  });

  const employee002 = employeesByNo.get("EMP-002");
  const employee004 = employeesByNo.get("EMP-004");
  const employee005 = employeesByNo.get("EMP-005");

  if (employee002) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: employee002.id,
        type: LeaveType.OFFICIAL,
        startDate: startOfDay(new Date()),
        endDate: addMinutes(startOfDay(new Date()), 24 * 60 - 1),
        reason: "Department reporting workshop",
        status: LeaveRequestStatus.APPROVED,
        managerReviewedByUserId: managerUser.id,
        managerReviewedAt: new Date(),
        managerReviewNotes: "Supervisor confirmed official assignment.",
        reviewedByUserId: hrAdmin.id,
        reviewedAt: new Date(),
        reviewNotes: "Approved for demo coverage"
      }
    });
  }

  if (employee004) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: employee004.id,
        type: LeaveType.ANNUAL,
        startDate: addMinutes(startOfDay(new Date()), 24 * 60),
        endDate: addMinutes(startOfDay(new Date()), 2 * 24 * 60),
        reason: "Requested leave for family commitment",
        status: LeaveRequestStatus.PENDING,
        managerReviewedByUserId: managerUser.id,
        managerReviewedAt: new Date(),
        managerReviewNotes: "Line manager approved and escalated to HR."
      }
    });

    await prisma.attendanceCorrection.create({
      data: {
        employeeId: employee004.id,
        date: startOfDay(new Date()),
        requestedCheckIn: atTime(startOfDay(new Date()), "08:01"),
        requestedCheckOut: atTime(startOfDay(new Date()), "17:03"),
        reason: "Forgot to check out at workshop gate",
        status: CorrectionRequestStatus.PENDING,
        managerReviewedByUserId: managerUser.id,
        managerReviewedAt: new Date(),
        managerReviewNotes: "Supervisor verified workshop presence."
      }
    });
  }

  const employee001 = employeesByNo.get("EMP-001");
  if (employee001) {
    await prisma.attendanceCorrection.create({
      data: {
        employeeId: employee001.id,
        date: startOfDay(subDays(new Date(), 1)),
        requestedCheckIn: atTime(startOfDay(subDays(new Date(), 1)), "07:58"),
        requestedCheckOut: atTime(startOfDay(subDays(new Date(), 1)), "17:06"),
        reason: "Exit device heartbeat delayed the captured checkout event.",
        status: CorrectionRequestStatus.APPLIED,
        managerReviewedByUserId: managerUser.id,
        managerReviewedAt: new Date(subDays(new Date(), 1)),
        managerReviewNotes: "Supervisor compared workstation logs and approved.",
        reviewedByUserId: hrAdmin.id,
        reviewedAt: new Date(subDays(new Date(), 1)),
        reviewNotes: "HR finalized and applied to the timesheet.",
        appliedAt: new Date(subDays(new Date(), 1))
      }
    });
  }

  if (employee005) {
    const anomaly = await prisma.attendanceAnomaly.create({
      data: {
        type: AnomalyType.EXCESSIVE_LATENESS,
        title: "Excessive lateness detected",
        description: "Farai Chirwa has repeated late arrivals this week.",
        employeeId: employee005.id
      }
    });

    await prisma.notification.create({
      data: {
        title: "Repeated lateness",
        message: "Farai Chirwa requires punctuality follow-up.",
        severity: NotificationSeverity.WARNING,
        status: NotificationStatus.OPEN,
        employeeId: employee005.id,
        anomalyId: anomaly.id
      }
    });
  }

  const suspendedEmployee = employeesByNo.get("EMP-006");
  if (suspendedEmployee) {
    const anomaly = await prisma.attendanceAnomaly.create({
      data: {
        type: AnomalyType.UNKNOWN_CARD,
        title: "Suspended RFID card attempted access",
        description: "Nyasha Ncube's suspended card was presented at the main entrance and blocked.",
        employeeId: suspendedEmployee.id,
        deviceId: mainEntrance.id,
        metadata: {
          scenario: "seeded-suspended-card",
          blocked: true
        }
      }
    });

    await prisma.notification.create({
      data: {
        title: "Blocked suspended card",
        message: "A suspended employee card was used at Main Entrance and requires supervisor follow-up.",
        severity: NotificationSeverity.CRITICAL,
        status: NotificationStatus.OPEN,
        employeeId: suspendedEmployee.id,
        deviceId: mainEntrance.id,
        anomalyId: anomaly.id
      }
    });
  }

  await prisma.enrollmentScan.create({
    data: {
      uid: "AA BB CC DD",
      deviceId: mainEntrance.id,
      status: EnrollmentStatus.PENDING,
      notes: "New card captured for assignment"
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
