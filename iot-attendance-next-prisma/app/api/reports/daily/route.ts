import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { buildTimesheetCsvRows, getDailyReportData, toCsv } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const fmt = searchParams.get("format");
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());

  const report = await getDailyReportData(date);

  if (fmt === "csv") {
    const headers = [
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
    const rows = buildTimesheetCsvRows(report.timesheets).map((r) => [
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
        "content-disposition": `attachment; filename="attendance-daily-${date.toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  return NextResponse.json({
    date: date.toISOString().slice(0, 10),
    summary: report.summary,
    rows: report.rows
  });
}
