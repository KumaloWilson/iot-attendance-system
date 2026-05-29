import {
  AttendanceStatus,
  EmployeeStatus,
  LeaveRequestStatus,
  type Employee,
  type Shift,
  type Timesheet
} from "@prisma/client";
import {
  eachDayOfInterval,
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek
} from "date-fns";
import { calculateOvertimeMinutes, shouldTrackAttendanceForDate } from "@/lib/attendance-policy";
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

export function buildTimesheetCsvRows(
  timesheets: Array<Timesheet & { employee: Employee & { shift: Shift | null; department: { name: string } | null } }>
) {
  return timesheets.map((row) => ({
    date: format(row.date, "yyyy-MM-dd"),
    employeeNo: row.employee.employeeNo,
    employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
    department: row.employee.department?.name ?? "",
    shift: row.employee.shift?.name ?? "",
    status: row.status,
    firstCheckIn: row.firstCheckIn?.toISOString() ?? "",
    lastCheckOut: row.lastCheckOut?.toISOString() ?? "",
    workedMinutes: row.workedMinutes,
    lateMinutes: row.lateMinutes,
    overtimeMinutes: calculateOvertimeMinutes(row.employee.shift, row.workedMinutes)
  }));
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows]
    .map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export async function getDailyReportData(date: Date) {
  const start = startOfDay(date);
  const end = endOfDay(date);

  await ensureTimesheetsForRange(start, end);

  const timesheets = await prisma.timesheet.findMany({
    where: { date: start },
    include: { employee: { include: { department: true, shift: true } } },
    orderBy: [{ employee: { firstName: "asc" } }]
  });

  const present = countPresentStatuses(timesheets);
  const late = timesheets.filter((t) => t.status === AttendanceStatus.LATE).length;
  const absent = timesheets.filter((t) => t.status === AttendanceStatus.ABSENT).length;
  const onLeave = timesheets.filter((t) => t.status === AttendanceStatus.ON_LEAVE).length;
  const totalWorkedMinutes = timesheets.reduce((s, t) => s + t.workedMinutes, 0);
  const totalLateMinutes = timesheets.reduce((s, t) => s + t.lateMinutes, 0);
  const totalOvertimeMinutes = timesheets.reduce(
    (s, t) => s + calculateOvertimeMinutes(t.employee.shift, t.workedMinutes),
    0
  );

  return {
    date: start,
    summary: { present, late, absent, onLeave, totalWorkedMinutes, totalLateMinutes, totalOvertimeMinutes },
    rows: buildTimesheetCsvRows(timesheets),
    timesheets
  };
}

export async function getWeeklyReportData(weekStart: Date) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });

  await ensureTimesheetsForRange(start, end);

  const timesheets = await prisma.timesheet.findMany({
    where: { date: { gte: start, lte: end } },
    include: { employee: { include: { department: true, shift: true } } },
    orderBy: [{ date: "asc" }, { employee: { firstName: "asc" } }]
  });

  const byEmployee = timesheets.reduce<
    Record<
      string,
      {
        employeeNo: string;
        name: string;
        department: string;
        presentDays: number;
        lateDays: number;
        absentDays: number;
        workedMinutes: number;
        lateMinutes: number;
        overtimeMinutes: number;
      }
    >
  >((acc, row) => {
    const key = row.employeeId;
    acc[key] ??= {
      employeeNo: row.employee.employeeNo,
      name: `${row.employee.firstName} ${row.employee.lastName}`,
      department: row.employee.department?.name ?? "Unassigned",
      presentDays: 0,
      lateDays: 0,
      absentDays: 0,
      workedMinutes: 0,
      lateMinutes: 0,
      overtimeMinutes: 0
    };
    if (row.status === AttendanceStatus.PRESENT || row.status === AttendanceStatus.LATE || row.status === AttendanceStatus.HALF_DAY) {
      acc[key].presentDays += 1;
    }
    if (row.status === AttendanceStatus.LATE) acc[key].lateDays += 1;
    if (row.status === AttendanceStatus.ABSENT) acc[key].absentDays += 1;
    acc[key].workedMinutes += row.workedMinutes;
    acc[key].lateMinutes += row.lateMinutes;
    acc[key].overtimeMinutes += calculateOvertimeMinutes(row.employee.shift, row.workedMinutes);
    return acc;
  }, {});

  const totalWorkedMinutes = timesheets.reduce((s, t) => s + t.workedMinutes, 0);
  const totalLateMinutes = timesheets.reduce((s, t) => s + t.lateMinutes, 0);
  const totalOvertimeMinutes = timesheets.reduce(
    (s, t) => s + calculateOvertimeMinutes(t.employee.shift, t.workedMinutes),
    0
  );

  return {
    weekStart: start,
    weekEnd: end,
    summary: {
      present: countPresentStatuses(timesheets),
      late: timesheets.filter((t) => t.status === AttendanceStatus.LATE).length,
      absent: timesheets.filter((t) => t.status === AttendanceStatus.ABSENT).length,
      totalWorkedMinutes,
      totalLateMinutes,
      totalOvertimeMinutes
    },
    byEmployee: Object.values(byEmployee).sort((a, b) => b.workedMinutes - a.workedMinutes),
    dailyRows: buildTimesheetCsvRows(timesheets),
    timesheets
  };
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
