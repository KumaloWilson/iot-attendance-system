import assert from "node:assert/strict";
import test from "node:test";
import { AttendanceStatus, type Shift } from "@prisma/client";
import { calculateOvertimeMinutes, evaluateTimesheet, shouldTrackAttendanceForDate } from "@/lib/attendance-policy";

const baseShift: Shift = {
  id: "shift-test",
  name: "Day",
  startTime: "08:00",
  endTime: "17:00",
  graceMinutes: 15,
  expectedMinutes: 480,
  halfDayMinutes: 240,
  overtimeAfterMinutes: 540,
  missedCheckoutGraceMinutes: 180,
  weekendAttendanceEnabled: false,
  createdAt: new Date(2026, 4, 15, 0, 0, 0, 0)
};

test("evaluateTimesheet marks late half-day correctly", () => {
  const day = new Date(2026, 4, 15, 0, 0, 0, 0);
  const firstCheckIn = new Date(2026, 4, 15, 8, 35, 0, 0);
  const lastCheckOut = new Date(2026, 4, 15, 11, 40, 0, 0);

  const result = evaluateTimesheet(baseShift, day, firstCheckIn, lastCheckOut);

  assert.equal(result.lateMinutes, 20);
  assert.equal(result.workedMinutes, 185);
  assert.equal(result.status, AttendanceStatus.HALF_DAY);
});

test("calculateOvertimeMinutes uses shift threshold", () => {
  assert.equal(calculateOvertimeMinutes(baseShift, 600), 60);
  assert.equal(calculateOvertimeMinutes(baseShift, 530), 0);
});

test("shouldTrackAttendanceForDate respects weekend policy", () => {
  const saturday = new Date(2026, 4, 16, 0, 0, 0, 0);

  assert.equal(shouldTrackAttendanceForDate(baseShift, saturday), false);
  assert.equal(
    shouldTrackAttendanceForDate({ ...baseShift, weekendAttendanceEnabled: true }, saturday),
    true
  );
});
