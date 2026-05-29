import { format, startOfWeek, subWeeks, addWeeks } from "date-fns";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHero } from "@/components/ui/page-hero";
import { PrintButton } from "@/components/ui/print-button";
import { formatMinutes } from "@/lib/attendance";
import { getWeeklyReportData } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function WeeklyReportPage({
  searchParams
}: {
  searchParams: { week?: string };
}) {
  const weekParam = searchParams.week;
  const anchor = weekParam ? new Date(weekParam) : new Date();
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const prevWeekStart = subWeeks(weekStart, 1);
  const nextWeekStart = addWeeks(weekStart, 1);
  const isCurrentWeek = weekStart.getTime() === startOfWeek(new Date(), { weekStartsOn: 1 }).getTime();

  const report = await getWeeklyReportData(weekStart);
  const { summary, byEmployee, weekEnd } = report;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Analytics"
        title="Weekly Report"
        description={`Attendance summary for the week of ${format(weekStart, "MMMM d")} – ${format(weekEnd, "MMMM d, yyyy")}.`}
        aside={
          <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
            <a
              href={`/reports/weekly?week=${format(prevWeekStart, "yyyy-MM-dd")}`}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              ← Previous week
            </a>
            {!isCurrentWeek && (
              <a
                href={`/reports/weekly?week=${format(nextWeekStart, "yyyy-MM-dd")}`}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Next week →
              </a>
            )}
            <a
              href={`/api/reports/weekly?week=${format(weekStart, "yyyy-MM-dd")}&format=csv`}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Export CSV
            </a>
            <PrintButton />
          </div>
        }
      />

      {/* Period navigation */}
      <div className="flex gap-2 text-sm font-semibold">
        <a href="/reports/daily" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">Daily</a>
        <a href="/reports/weekly" className="rounded-lg bg-brand-700 px-4 py-2 text-white">Weekly</a>
        <a href="/reports" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">Monthly</a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Present days" value={summary.present} accent="emerald" />
        <MetricCard label="Late days" value={summary.late} accent="amber" />
        <MetricCard label="Absent days" value={summary.absent} accent="rose" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total worked" value={formatMinutes(summary.totalWorkedMinutes)} accent="blue" />
        <MetricCard label="Total late minutes" value={formatMinutes(summary.totalLateMinutes)} accent="amber" />
        <MetricCard label="Total overtime" value={formatMinutes(summary.totalOvertimeMinutes)} accent="blue" />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Employee weekly summary</h2>
            <p className="text-sm text-slate-500">
              {format(weekStart, "dd MMM")} – {format(weekEnd, "dd MMM yyyy")}
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Employee</th>
                <th>Department</th>
                <th>Present</th>
                <th>Late days</th>
                <th>Absent</th>
                <th>Worked</th>
                <th>Late min</th>
                <th>Overtime</th>
              </tr>
            </thead>
            <tbody>
              {byEmployee.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">No records for this week</td>
                </tr>
              )}
              {byEmployee.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-3 font-semibold">
                    {row.name}
                    <span className="ml-1 text-xs text-slate-400">{row.employeeNo}</span>
                  </td>
                  <td className="text-slate-600">{row.department}</td>
                  <td className="text-emerald-700 font-semibold">{row.presentDays}</td>
                  <td className={row.lateDays > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>
                    {row.lateDays}
                  </td>
                  <td className={row.absentDays > 0 ? "text-rose-600 font-semibold" : "text-slate-400"}>
                    {row.absentDays}
                  </td>
                  <td>{row.workedMinutes > 0 ? formatMinutes(row.workedMinutes) : "—"}</td>
                  <td className={row.lateMinutes > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>
                    {row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—"}
                  </td>
                  <td className={row.overtimeMinutes > 0 ? "text-blue-600 font-semibold" : "text-slate-400"}>
                    {row.overtimeMinutes > 0 ? formatMinutes(row.overtimeMinutes) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
