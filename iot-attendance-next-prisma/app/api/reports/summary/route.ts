import { NextResponse } from "next/server";
import { endOfMonth, startOfMonth } from "date-fns";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { countPresentStatuses, ensureTimesheetsForRange } from "@/lib/reporting";
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

  const summary = {
    activeEmployees: employees.length,
    presentDays: countPresentStatuses(timesheets),
    lateDays: timesheets.filter((t) => t.status === "LATE").length,
    absentDays: timesheets.filter((t) => t.status === "ABSENT").length,
    totalWorkedMinutes: timesheets.reduce((sum, t) => sum + t.workedMinutes, 0),
    totalLateMinutes: timesheets.reduce((sum, t) => sum + t.lateMinutes, 0),
    completionRate: employees.length === 0 ? 0 : Math.round((countPresentStatuses(timesheets) / timesheets.length) * 100)
  };

  if (format === "csv") {
    const headers = [
      "date",
      "employeeNo",
      "employeeName",
      "department",
      "status",
      "firstCheckIn",
      "lastCheckOut",
      "workedMinutes",
      "lateMinutes"
    ];
    const rows = timesheets.map((row) => [
      row.date.toISOString().slice(0, 10),
      row.employee.employeeNo,
      `${row.employee.firstName} ${row.employee.lastName}`,
      row.employee.department?.name ?? "",
      row.status,
      row.firstCheckIn?.toISOString() ?? "",
      row.lastCheckOut?.toISOString() ?? "",
      String(row.workedMinutes),
      String(row.lateMinutes)
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="attendance-summary-${month.toISOString().slice(0, 7)}.csv"`
      }
    });
  }

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
    timesheets
  });
}
