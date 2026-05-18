import { endOfMonth, startOfMonth } from "date-fns";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHero } from "@/components/ui/page-hero";
import { formatMinutes } from "@/lib/attendance";
import { prisma } from "@/lib/prisma";
import { ensureTimesheetsForRange, statusTone } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function TimesheetsPage() {
  const start = startOfMonth(new Date());
  const end = endOfMonth(new Date());

  await ensureTimesheetsForRange(start, end);

  const rows = await prisma.timesheet.findMany({
    where: { date: { gte: start, lte: end } },
    include: { employee: { include: { department: true } } },
    orderBy: [{ date: "desc" }, { employee: { firstName: "asc" } }],
    take: 180
  });

  const totalWorked = rows.reduce((sum, row) => sum + row.workedMinutes, 0);
  const totalLate = rows.reduce((sum, row) => sum + row.lateMinutes, 0);

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Payroll Support"
        title="Timesheets"
        description="Daily attendance summaries per employee, including worked minutes, lateness, policy state, and payroll-ready notes."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Rows this month" value={rows.length} accent="slate" />
        <MetricCard label="Worked time" value={formatMinutes(totalWorked)} accent="blue" />
        <MetricCard label="Late minutes" value={formatMinutes(totalLate)} accent="amber" />
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No timesheets available yet"
            description="Create attendance events or seed demo data to populate payroll summaries for the current month."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th>Employee</th>
                <th>Department</th>
                <th>In</th>
                <th>Out</th>
                <th>Worked</th>
                <th>Late</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="py-3">{row.date.toISOString().slice(0, 10)}</td>
                  <td>{row.employee.firstName} {row.employee.lastName}</td>
                  <td>{row.employee.department?.name ?? "-"}</td>
                  <td>{row.firstCheckIn?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"}</td>
                  <td>{row.lastCheckOut?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"}</td>
                  <td>{formatMinutes(row.workedMinutes)}</td>
                  <td>{formatMinutes(row.lateMinutes)}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusTone(row.status)}`}>
                      {row.status.replace("_", " ")}
                    </span>
                  </td>
                  <td>{row.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </section>
  );
}
