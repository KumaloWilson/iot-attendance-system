import { NextResponse } from "next/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { calculateOvertimeMinutes } from "@/lib/attendance-policy";
import { buildTimesheetCsvRows, countPresentStatuses, ensureTimesheetsForRange, toCsv } from "@/lib/reporting";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ? new Date(`${searchParams.get("month")}-01`) : new Date();
  const format = searchParams.get("format");
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  const employees = await ensureTimesheetsForRange(start, end);
  const timesheets = await prisma.timesheet.findMany({
    where: { date: { gte: start, lte: end } },
    include: { employee: { include: { department: true, shift: true } } },
    orderBy: [{ date: "desc" }, { employee: { firstName: "asc" } }]
  });

  const byDepartment = timesheets.reduce<Record<string, { total: number; late: number; absent: number }>>((acc, row) => {
    const key = row.employee.department?.name ?? "Unassigned";
    acc[key] ??= { total: 0, late: 0, absent: 0 };
    acc[key].total += 1;
    if (row.status === "LATE") acc[key].late += 1;
    if (row.status === "ABSENT") acc[key].absent += 1;
    return acc;
  }, {});

  const deviceStats = await prisma.device.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: { name: "asc" }
  });

  const totalOvertimeMinutes = timesheets.reduce(
    (sum, t) => sum + calculateOvertimeMinutes(t.employee.shift, t.workedMinutes),
    0
  );

  const summary = {
    activeEmployees: employees.length,
    presentDays: countPresentStatuses(timesheets),
    lateDays: timesheets.filter((t) => t.status === "LATE").length,
    absentDays: timesheets.filter((t) => t.status === "ABSENT").length,
    totalWorkedMinutes: timesheets.reduce((sum, t) => sum + t.workedMinutes, 0),
    totalLateMinutes: timesheets.reduce((sum, t) => sum + t.lateMinutes, 0),
    totalOvertimeMinutes,
    completionRate: employees.length === 0 ? 0 : Math.round((countPresentStatuses(timesheets) / timesheets.length) * 100)
  };

  if (format === "csv") {
    const headers = [
      "date",
      "employeeNo",
      "employeeName",
      "department",
      "shift",
      "status",
      "firstCheckIn",
      "lastCheckOut",
      "workedMinutes",
      "lateMinutes",
      "overtimeMinutes"
    ];
    const rows = buildTimesheetCsvRows(timesheets).map((r) => [
      r.date,
      r.employeeNo,
      r.employeeName,
      r.department,
      r.shift,
      r.status,
      r.firstCheckIn,
      r.lastCheckOut,
      r.workedMinutes,
      r.lateMinutes,
      r.overtimeMinutes
    ]);
    const csv = toCsv(headers, rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="attendance-summary-${month.toISOString().slice(0, 7)}.csv"`
      }
    });
  }

  const enrichedTimesheets = timesheets.map((t) => ({
    ...t,
    overtimeMinutes: calculateOvertimeMinutes(t.employee.shift, t.workedMinutes)
  }));

  return NextResponse.json({
    summary,
    departments: Object.entries(byDepartment).map(([name, values]) => ({ name, ...values })),
    devices: deviceStats.map((device) => ({
      deviceCode: device.deviceCode,
      name: device.name,
      mode: device.mode,
      events: device._count.events,
      lastSeenAt: device.lastSeenAt,
      firmwareVersion: device.firmwareVersion,
      isActive: device.isActive
    })),
    timesheets: enrichedTimesheets
  });
}
