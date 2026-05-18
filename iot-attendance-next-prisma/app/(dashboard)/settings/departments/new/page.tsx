import Link from "next/link";
import { UserRole } from "@prisma/client";
import { DepartmentForm } from "@/components/settings/department-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { createDepartmentAction } from "../../actions";

export default async function NewDepartmentPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  return (
    <SettingsShell
      activeHref="/settings/departments"
      title="Add Department"
      description="Create a department using a dedicated form instead of editing inline on the overview screen."
      actions={<Link href="/settings/departments" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to departments</Link>}
    >
      <DepartmentForm action={createDepartmentAction} submitLabel="Create department" redirectTo="/settings/departments" />
    </SettingsShell>
  );
}
