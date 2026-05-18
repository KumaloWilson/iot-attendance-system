import assert from "node:assert/strict";
import test from "node:test";
import {
  AttendanceStatus,
  DeviceMode,
  EmployeeStatus,
  LeaveRequestStatus,
  LeaveType
} from "@prisma/client";
import { handleIotAttendanceTap } from "@/lib/attendance";
import { applyApprovedCorrection, syncTimesheetLeaveState } from "@/lib/operations";
import { prisma } from "@/lib/prisma";

type Fixture = {
  deviceCode: string;
  employeeId: string;
  employeeUid: string;
  shiftId: string;
  deviceId: string;
};

async function createFixture(tag: string): Promise<Fixture> {
  const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const department = await prisma.department.create({
    data: { name: `QA-${suffix}` }
  });
  const shift = await prisma.shift.create({
    data: {
      name: `Shift-${suffix}`,
      startTime: "08:00",
      endTime: "17:00",
      graceMinutes: 15,
      expectedMinutes: 480,
      halfDayMinutes: 240,
      overtimeAfterMinutes: 540,
      missedCheckoutGraceMinutes: 0,
      weekendAttendanceEnabled: true
    }
  });
  const device = await prisma.device.create({
    data: {
      deviceCode: `TEST-${suffix}`.toUpperCase(),
      name: `Test Device ${suffix}`,
      mode: DeviceMode.ENTRY_EXIT,
      isActive: true
    }
  });
  const employee = await prisma.employee.create({
    data: {
      employeeNo: `EMP-${suffix}`.toUpperCase().slice(0, 30),
      firstName: "Test",
      lastName: "User",
      rfidUid: `UID-${suffix}`.toUpperCase().slice(0, 32),
      status: EmployeeStatus.ACTIVE,
      departmentId: department.id,
      shiftId: shift.id
    }
  });

  return {
    deviceCode: device.deviceCode,
    employeeId: employee.id,
    employeeUid: employee.rfidUid,
    shiftId: shift.id,
    deviceId: device.id
  };
}

async function cleanupFixture(fixture: Fixture) {
  await prisma.notification.deleteMany({ where: { OR: [{ employeeId: fixture.employeeId }, { deviceId: fixture.deviceId }] } });
  await prisma.attendanceAnomaly.deleteMany({ where: { OR: [{ employeeId: fixture.employeeId }, { deviceId: fixture.deviceId }] } });
  await prisma.attendanceEvent.deleteMany({ where: { employeeId: fixture.employeeId } });
  await prisma.timesheet.deleteMany({ where: { employeeId: fixture.employeeId } });
  await prisma.leaveRequest.deleteMany({ where: { employeeId: fixture.employeeId } });
  await prisma.attendanceCorrection.deleteMany({ where: { employeeId: fixture.employeeId } });
  await prisma.employee.delete({ where: { id: fixture.employeeId } });
  await prisma.device.delete({ where: { id: fixture.deviceId } });
  await prisma.shift.delete({ where: { id: fixture.shiftId } });
  await prisma.department.deleteMany({ where: { employees: { none: {} }, name: { startsWith: "QA-" } } });
}

test("handleIotAttendanceTap records a check-in and suppresses a duplicate tap", { concurrency: false }, async () => {
  const fixture = await createFixture("dup");

  try {
    const occurredAt = new Date(2026, 4, 15, 8, 5, 0, 0);
    const first = await handleIotAttendanceTap({
      uid: fixture.employeeUid,
      deviceCode: fixture.deviceCode,
      occurredAt,
      idempotencyKey: `tap-${fixture.deviceCode}-1`,
      rawPayload: { test: true }
    });
    const duplicate = await handleIotAttendanceTap({
      uid: fixture.employeeUid,
      deviceCode: fixture.deviceCode,
      occurredAt: new Date(2026, 4, 15, 8, 5, 40, 0),
      rawPayload: { test: true }
    });

    const events = await prisma.attendanceEvent.findMany({ where: { employeeId: fixture.employeeId } });

    assert.equal(first.code, "CHECK_IN_RECORDED");
    assert.equal(duplicate.code, "DUPLICATE_TAP");
    assert.equal(events.length, 1);
  } finally {
    await cleanupFixture(fixture);
  }
});

test("unknown card is rejected and creates an anomaly notification", { concurrency: false }, async () => {
  const fixture = await createFixture("unknown");

  try {
    const result = await handleIotAttendanceTap({
      uid: "UNKNOWN-UID-001",
      deviceCode: fixture.deviceCode,
      occurredAt: new Date(2026, 4, 15, 9, 0, 0, 0),
      rawPayload: { test: true }
    });

    const anomaly = await prisma.attendanceAnomaly.findFirst({
      where: { deviceId: fixture.deviceId, type: "UNKNOWN_CARD" },
      include: { notification: true }
    });

    assert.equal(result.code, "UNKNOWN_CARD");
    assert.ok(anomaly);
    assert.equal(anomaly?.notification?.status, "OPEN");
  } finally {
    await cleanupFixture(fixture);
  }
});

test("out-of-shift scan creates anomaly and approved leave syncs timesheet state", { concurrency: false }, async () => {
  const fixture = await createFixture("anomaly");

  try {
    const eventResult = await handleIotAttendanceTap({
      uid: fixture.employeeUid,
      deviceCode: fixture.deviceCode,
      occurredAt: new Date(2026, 4, 15, 3, 15, 0, 0),
      idempotencyKey: `out-shift-${fixture.deviceCode}`,
      rawPayload: { test: true }
    });

    assert.equal(eventResult.code, "CHECK_IN_RECORDED");

    const outOfShift = await prisma.attendanceAnomaly.findFirst({
      where: { employeeId: fixture.employeeId, type: "OUT_OF_SHIFT" }
    });
    assert.ok(outOfShift);

    const leaveDate = new Date(2026, 4, 16, 0, 0, 0, 0);
    await prisma.leaveRequest.create({
      data: {
        employeeId: fixture.employeeId,
        type: LeaveType.ANNUAL,
        startDate: leaveDate,
        endDate: leaveDate,
        reason: "Test leave",
        status: LeaveRequestStatus.APPROVED
      }
    });

    await syncTimesheetLeaveState(fixture.employeeId, leaveDate);

    const timesheet = await prisma.timesheet.findUnique({
      where: { employeeId_date: { employeeId: fixture.employeeId, date: new Date(2026, 4, 16, 0, 0, 0, 0) } }
    });

    assert.equal(timesheet?.status, AttendanceStatus.ON_LEAVE);
  } finally {
    await cleanupFixture(fixture);
  }
});

test("applyApprovedCorrection updates the timesheet and marks the correction as applied", { concurrency: false }, async () => {
  const fixture = await createFixture("correction");

  try {
    const correction = await prisma.attendanceCorrection.create({
      data: {
        employeeId: fixture.employeeId,
        date: new Date(2026, 4, 15, 0, 0, 0, 0),
        requestedCheckIn: new Date(2026, 4, 15, 8, 6, 0, 0),
        requestedCheckOut: new Date(2026, 4, 15, 17, 24, 0, 0),
        reason: "Manual correction"
      }
    });

    await applyApprovedCorrection(correction.id);

    const updatedCorrection = await prisma.attendanceCorrection.findUnique({ where: { id: correction.id } });
    const timesheet = await prisma.timesheet.findUnique({
      where: { employeeId_date: { employeeId: fixture.employeeId, date: new Date(2026, 4, 15, 0, 0, 0, 0) } }
    });

    assert.equal(updatedCorrection?.status, "APPLIED");
    assert.equal(timesheet?.status, AttendanceStatus.PRESENT);
    assert.equal(timesheet?.workedMinutes, 558);
  } finally {
    await cleanupFixture(fixture);
  }
});
