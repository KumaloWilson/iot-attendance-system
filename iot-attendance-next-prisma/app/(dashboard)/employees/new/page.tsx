import Link from "next/link";
import { UserRole } from "@prisma/client";
import { EmployeeForm } from "@/components/settings/employee-form";
import { createEmployeeAction } from "../actions";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function NewEmployeePage() {
  await requirePageRole(UserRole.HR_ADMIN);

  const [departments, shifts] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <SettingsShell
      activeHref="/settings"
      title="Add Employee"
      description="Create an employee record through a dedicated form with RFID, department, shift, and status fields."
      actions={<Link href="/employees" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to employees</Link>}
    >
      <EmployeeForm
        action={createEmployeeAction}
        submitLabel="Create employee"
        redirectTo="/employees"
        departments={departments}
        shifts={shifts}
      />
    </SettingsShell>
  );
}
