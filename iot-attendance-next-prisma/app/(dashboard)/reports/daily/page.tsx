import { format, startOfDay, subDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHero } from "@/components/ui/page-hero";
import { PrintButton } from "@/components/ui/print-button";
import { formatMinutes } from "@/lib/attendance";
import { getDailyReportData, statusTone } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function DailyReportPage({
  searchParams
}: {
  searchParams: { date?: string };
}) {
  const dateParam = searchParams.date;
  const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
  const prevDate = subDays(date, 1);
  const nextDate = new Date(date.getTime() + 86_400_000);
  const isToday = date.getTime() === startOfDay(new Date()).getTime();

  const report = await getDailyReportData(date);
  const { summary, rows } = report;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Analytics"
        title="Daily Report"
        description={`Attendance breakdown for ${format(date, "EEEE, MMMM d, yyyy")}.`}
        aside={
          <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
            <a
              href={`/reports/daily?date=${format(prevDate, "yyyy-MM-dd")}`}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
            >
              ← Previous day
            </a>
            {!isToday && (
              <a
                href={`/reports/daily?date=${format(nextDate, "yyyy-MM-dd")}`}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Next day →
              </a>
            )}
            <a
              href={`/api/reports/daily?date=${format(date, "yyyy-MM-dd")}&format=csv`}
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
        <a href="/reports/daily" className="rounded-lg bg-brand-700 px-4 py-2 text-white">Daily</a>
        <a href="/reports/weekly" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">Weekly</a>
        <a href="/reports" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">Monthly</a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Present" value={summary.present} accent="emerald" />
        <MetricCard label="Late arrivals" value={summary.late} accent="amber" />
        <MetricCard label="Absent" value={summary.absent} accent="rose" />
        <MetricCard label="On leave" value={summary.onLeave} accent="slate" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Worked time" value={formatMinutes(summary.totalWorkedMinutes)} accent="blue" />
        <MetricCard label="Total late minutes" value={formatMinutes(summary.totalLateMinutes)} accent="amber" />
        <MetricCard label="Overtime minutes" value={formatMinutes(summary.totalOvertimeMinutes)} accent="blue" />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Employee attendance</h2>
            <p className="text-sm text-slate-500">{rows.length} records for {format(date, "dd MMM yyyy")}</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Employee</th>
                <th>Dept</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Worked</th>
                <th>Late min</th>
                <th>Overtime</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">No records for this day</td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-3 font-semibold">
                    {row.employeeName}
                    <span className="ml-1 text-xs text-slate-400">{row.employeeNo}</span>
                  </td>
                  <td className="text-slate-600">{row.department}</td>
                  <td className="text-slate-600">{row.shift}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${statusTone(row.status as any)}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs">
                    {row.firstCheckIn ? new Date(row.firstCheckIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
                  </td>
                  <td className="font-mono text-xs">
                    {row.lastCheckOut ? new Date(row.lastCheckOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
                  </td>
                  <td>{row.workedMinutes > 0 ? formatMinutes(row.workedMinutes) : "—"}</td>
                  <td className={row.lateMinutes > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>
                    {row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—"}
                  </td>
                  <td className={row.overtimeMinutes > 0 ? "text-blue-600 font-semibold" : "text-slate-400"}>
                    {row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m` : "—"}
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
