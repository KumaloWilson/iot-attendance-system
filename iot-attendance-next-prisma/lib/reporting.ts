import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveRequestStatus,
  type Employee,
  type Shift,
  type Timesheet
} from "@prisma/client";
import { eachDayOfInterval, endOfDay, startOfDay } from "date-fns";
import { shouldTrackAttendanceForDate } from "@/lib/attendance-policy";
import { prisma } from "@/lib/prisma";
import { formatDateKey } from "@/lib/attendance";

type EmployeeWithShift = Employee & {
  shift: Shift | null;
};

export async function ensureTimesheetsForRange(start: Date, end: Date) {
  const rangeStart = startOfDay(start);
  const rangeEnd = endOfDay(end);

  const [employees, existing, approvedLeaves] = await Promise.all([
    prisma.employee.findMany({
      where: { status: EmployeeStatus.ACTIVE },
      include: { shift: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    }),
    prisma.timesheet.findMany({
      where: { date: { gte: rangeStart, lte: rangeEnd } },
      select: { employeeId: true, date: true }
    }),
    prisma.leaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: rangeEnd },
        endDate: { gte: rangeStart }
      },
      select: { employeeId: true, startDate: true, endDate: true, type: true }
    })
  ]);

  const existingKeys = new Set(existing.map((row) => `${row.employeeId}:${formatDateKey(row.date)}`));
  const leaveKeys = new Map<string, string>();
  const missingRows = [];

  for (const leave of approvedLeaves) {
    for (const day of eachDayOfInterval({ start: startOfDay(leave.startDate), end: startOfDay(leave.endDate) })) {
      leaveKeys.set(`${leave.employeeId}:${formatDateKey(day)}`, leave.type);
    }
  }

  for (const day of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
    const normalizedDay = startOfDay(day);
    const dateKey = formatDateKey(normalizedDay);

    for (const employee of employees) {
      const shouldTrack = shouldTrackAttendanceForDate(employee.shift, normalizedDay);
      const key = `${employee.id}:${dateKey}`;
      if (existingKeys.has(key)) continue;
      if (!shouldTrack && !leaveKeys.has(key)) continue;

      missingRows.push({
        employeeId: employee.id,
        date: normalizedDay,
        status: leaveKeys.has(key) ? AttendanceStatus.ON_LEAVE : AttendanceStatus.ABSENT,
        workedMinutes: 0,
        lateMinutes: 0,
        notes: leaveKeys.has(key)
          ? `${leaveKeys.get(key)} leave approved`
          : shouldTrack
            ? "Auto-generated daily placeholder"
            : "Weekend attendance not required for this shift"
      });
    }
  }

  if (missingRows.length > 0) {
    await prisma.timesheet.createMany({
      data: missingRows,
      skipDuplicates: true
    });
  }

  return employees as EmployeeWithShift[];
}

export function countPresentStatuses(timesheets: Timesheet[]) {
  return timesheets.filter((row) =>
    row.status === AttendanceStatus.PRESENT ||
    row.status === AttendanceStatus.LATE ||
    row.status === AttendanceStatus.HALF_DAY
  ).length;
}

export function statusTone(status: AttendanceStatus) {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case AttendanceStatus.LATE:
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case AttendanceStatus.HALF_DAY:
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case AttendanceStatus.ON_LEAVE:
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case AttendanceStatus.ABSENT:
    default:
      return "bg-rose-50 text-rose-700 ring-rose-200";
  }
}
