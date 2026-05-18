import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  const shifts = await prisma.shift.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" }
  });

  return (
    <SettingsShell
      activeHref="/settings/shifts"
      title="Shifts"
      description="Manage attendance policy in dedicated shift configuration forms."
      actions={<Link href="/settings/shifts/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Add shift</Link>}
    >
      <Card>
        <div className="space-y-3">
          {shifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-900">{shift.name}</p>
                <p className="text-sm text-slate-500">
                  {shift.startTime} - {shift.endTime} · {shift._count.employees} employees
                </p>
              </div>
              <Link href={`/settings/shifts/${shift.id}/edit`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Edit
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </SettingsShell>
  );
}
