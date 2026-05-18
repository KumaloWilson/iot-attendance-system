import { Card } from "@/components/ui/card";
import { getStakeholderSummaries } from "@/lib/operations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const [stakeholders, recentTimesheets] = await Promise.all([
    getStakeholderSummaries(),
    prisma.timesheet.findMany({
      include: { employee: true },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      take: 8
    })
  ]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Stakeholder Views</p>
        <h1 className="text-3xl font-black">Role-Oriented Portal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Distinct presentation layers for employees, supervisors, HR teams, and administrators.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {Object.values(stakeholders).map((item) => (
          <Card key={item.title}>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-700">{item.title}</p>
            <p className="mt-3 text-sm text-slate-600">{item.detail}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-lg font-black">Recent portal-ready attendance summaries</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th>Name</th>
                <th>Status</th>
                <th>In</th>
                <th>Out</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {recentTimesheets.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="py-3">{row.date.toISOString().slice(0, 10)}</td>
                  <td>{row.employee.firstName} {row.employee.lastName}</td>
                  <td>{row.status.replace("_", " ")}</td>
                  <td>{row.firstCheckIn?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"}</td>
                  <td>{row.lastCheckOut?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) ?? "-"}</td>
                  <td>{row.notes ?? "No note"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
