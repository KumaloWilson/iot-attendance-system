import { NextResponse } from "next/server";
import { startOfWeek } from "date-fns";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/authorization";
import { getWeeklyReportData, toCsv } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");
  const fmt = searchParams.get("format");
  const anchor = weekParam ? new Date(weekParam) : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });

  const report = await getWeeklyReportData(weekStart);

  if (fmt === "csv") {
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
    const rows = report.dailyRows.map((r) => [
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
        "content-disposition": `attachment; filename="attendance-weekly-${weekStart.toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  return NextResponse.json({
    weekStart: report.weekStart.toISOString().slice(0, 10),
    weekEnd: report.weekEnd.toISOString().slice(0, 10),
    summary: report.summary,
    byEmployee: report.byEmployee
  });
}
