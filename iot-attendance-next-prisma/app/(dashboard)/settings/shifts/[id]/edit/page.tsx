import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ShiftForm } from "@/components/settings/shift-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Card } from "@/components/ui/card";
import { deleteShiftAction, updateShiftAction } from "../../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function EditShiftPage({ params }: { params: { id: string } }) {
  await requirePageRole(UserRole.HR_ADMIN);

  const shift = await prisma.shift.findUnique({
    where: { id: params.id },
    include: { _count: { select: { employees: true } } }
  });

  if (!shift) notFound();

  return (
    <SettingsShell
      activeHref="/settings/shifts"
      title={`Edit ${shift.name}`}
      description="Maintain shift timing and policy settings from a dedicated edit screen."
      actions={<Link href="/settings/shifts" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to shifts</Link>}
    >
      <ShiftForm
        action={updateShiftAction}
        submitLabel="Save shift"
        id={shift.id}
        redirectTo="/settings/shifts"
        defaults={shift}
      />
      <Card className="max-w-3xl">
        <p className="text-sm text-slate-600">{shift._count.employees} employees are assigned to this shift template.</p>
        <form action={deleteShiftAction} className="mt-4">
          <input type="hidden" name="id" value={shift.id} />
          <input type="hidden" name="redirectTo" value="/settings/shifts" />
          <button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
            Delete shift
          </button>
        </form>
      </Card>
    </SettingsShell>
  );
}
