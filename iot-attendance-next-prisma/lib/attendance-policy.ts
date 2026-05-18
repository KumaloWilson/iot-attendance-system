import { AttendanceStatus, type Shift } from "@prisma/client";
import { isWeekend, startOfDay } from "date-fns";

export function parseTimeForDate(date: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const target = new Date(date);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

export function diffMinutes(start?: Date | null, end?: Date | null) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function shouldTrackAttendanceForDate(shift: Shift | null, date: Date) {
  if (!shift) return true;
  return shift.weekendAttendanceEnabled || !isWeekend(date);
}

export function calculateOvertimeMinutes(shift: Shift | null, workedMinutes: number) {
  if (!shift) return 0;
  return Math.max(0, workedMinutes - shift.overtimeAfterMinutes);
}

export function evaluateTimesheet(shift: Shift | null, day: Date, firstCheckIn?: Date | null, lastCheckOut?: Date | null) {
  const normalizedDay = startOfDay(day);
  const workedMinutes = diffMinutes(firstCheckIn, lastCheckOut);
  let lateMinutes = 0;
  let status: AttendanceStatus = AttendanceStatus.ABSENT;
  let notes: string | null = null;

  if (!firstCheckIn) {
    return { day: normalizedDay, workedMinutes, lateMinutes, overtimeMinutes: 0, status, notes };
  }

  if (shift) {
    const expectedStart = parseTimeForDate(normalizedDay, shift.startTime);
    const graceStart = new Date(expectedStart.getTime() + shift.graceMinutes * 60_000);
    lateMinutes = Math.max(0, diffMinutes(graceStart, firstCheckIn));
    status = lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    if (workedMinutes > 0 && workedMinutes < shift.halfDayMinutes) {
      status = AttendanceStatus.HALF_DAY;
    }
  } else {
    status = AttendanceStatus.PRESENT;
  }

  if (!lastCheckOut) {
    notes = shift
      ? `Open session awaiting checkout beyond ${shift.missedCheckoutGraceMinutes} minutes requires review`
      : "Open session awaiting checkout";
  }

  return {
    day: normalizedDay,
    workedMinutes,
    lateMinutes,
    overtimeMinutes: calculateOvertimeMinutes(shift, workedMinutes),
    status,
    notes
  };
}
