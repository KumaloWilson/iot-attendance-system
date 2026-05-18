import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { DepartmentForm } from "@/components/settings/department-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Card } from "@/components/ui/card";
import { deleteDepartmentAction, updateDepartmentAction } from "../../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function EditDepartmentPage({ params }: { params: { id: string } }) {
  await requirePageRole(UserRole.HR_ADMIN);

  const department = await prisma.department.findUnique({
    where: { id: params.id },
    include: { _count: { select: { employees: true } } }
  });

  if (!department) notFound();

  return (
    <SettingsShell
      activeHref="/settings/departments"
      title={`Edit ${department.name}`}
      description="Update department details in a dedicated form and remove the record from a separate destructive action area."
      actions={<Link href="/settings/departments" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to departments</Link>}
    >
      <DepartmentForm
        action={updateDepartmentAction}
        submitLabel="Save department"
        defaultName={department.name}
        id={department.id}
        redirectTo="/settings/departments"
      />
      <Card className="max-w-2xl">
        <p className="text-sm text-slate-600">{department._count.employees} employees are assigned to this department.</p>
        <form action={deleteDepartmentAction} className="mt-4">
          <input type="hidden" name="id" value={department.id} />
          <input type="hidden" name="redirectTo" value="/settings/departments" />
          <button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
            Delete department
          </button>
        </form>
      </Card>
    </SettingsShell>
  );
}
