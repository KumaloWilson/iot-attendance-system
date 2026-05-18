import Link from "next/link";
import { NotificationSeverity, UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OperationsShell } from "@/components/operations/operations-shell";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: { q?: string; severity?: string };
}) {
  await requirePageRole(UserRole.MANAGER);
  const q = searchParams?.q?.trim() ?? "";
  const severityFilter = searchParams?.severity?.trim() ?? "";

  const notifications = await prisma.notification.findMany({
    where: {
      status: "OPEN",
      ...(severityFilter ? { severity: severityFilter as NotificationSeverity } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { message: { contains: q, mode: "insensitive" } },
              { employee: { firstName: { contains: q, mode: "insensitive" } } },
              { employee: { lastName: { contains: q, mode: "insensitive" } } },
              { device: { name: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: { employee: true, device: true },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <OperationsShell
      activeHref="/operations/notifications"
      title="Notification Queue"
      description="Review and triage attendance alerts from a dedicated notification queue."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <Card>
        <form className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto]">
          <input name="q" defaultValue={q} placeholder="Search by alert, employee, or device" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          <select name="severity" defaultValue={severityFilter} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Filter</button>
        </form>
        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <EmptyState title="No alerts match this filter" description="Adjust the search phrase or severity filter to inspect a different part of the queue." />
          ) : notifications.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-900">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {notification.employee ? `${notification.employee.firstName} ${notification.employee.lastName}` : "No employee"} · {notification.device?.name ?? "No device"} · {notification.createdAt.toLocaleString()}
                </p>
              </div>
              <Link href={`/operations/notifications/${notification.id}/review`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Review
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </OperationsShell>
  );
}
