import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { OperationsShell } from "@/components/operations/operations-shell";
import { Card } from "@/components/ui/card";
import { updateNotificationStatusAction } from "../../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function ReviewNotificationPage({ params }: { params: { id: string } }) {
  await requirePageRole(UserRole.MANAGER);

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
    include: { employee: true, device: true, anomaly: true }
  });

  if (!notification) notFound();

  return (
    <OperationsShell
      activeHref="/operations/notifications"
      title="Review Notification"
      description="Acknowledge or resolve the alert from a dedicated review screen."
      actions={<Link href="/operations/notifications" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to notifications</Link>}
    >
      <Card className="max-w-3xl">
        <p className="font-semibold text-slate-900">{notification.title}</p>
        <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
        <p className="mt-2 text-xs text-slate-500">
          {notification.employee ? `${notification.employee.firstName} ${notification.employee.lastName}` : "No employee"} · {notification.device?.name ?? "No device"} · {notification.createdAt.toLocaleString()}
        </p>
      </Card>
      <Card className="max-w-3xl">
        <div className="flex gap-3">
          <form action={updateNotificationStatusAction}>
            <input type="hidden" name="id" value={notification.id} />
            <input type="hidden" name="status" value="ACKNOWLEDGED" />
            <input type="hidden" name="redirectTo" value="/operations/notifications" />
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Acknowledge</button>
          </form>
          <form action={updateNotificationStatusAction}>
            <input type="hidden" name="id" value={notification.id} />
            <input type="hidden" name="status" value="RESOLVED" />
            <input type="hidden" name="redirectTo" value="/operations/notifications" />
            <button className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700">Resolve</button>
          </form>
        </div>
      </Card>
    </OperationsShell>
  );
}
