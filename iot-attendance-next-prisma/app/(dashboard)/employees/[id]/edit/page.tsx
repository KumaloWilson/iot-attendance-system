import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { EmployeeForm } from "@/components/settings/employee-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Card } from "@/components/ui/card";
import { deleteEmployeeAction, updateEmployeeAction } from "../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const auth = await requirePageRole(UserRole.HR_ADMIN);

  const [employee, departments, shifts] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { leaveRequests: true, anomalies: true, corrections: true } }
      }
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.shift.findMany({ orderBy: { name: "asc" } })
  ]);

  if (!employee) notFound();

  return (
    <SettingsShell
      activeHref="/settings"
      title={`Edit ${employee.firstName} ${employee.lastName}`}
      description="Update the employee record in a dedicated management screen and keep destructive actions separate."
      actions={<Link href="/employees" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to employees</Link>}
    >
      <EmployeeForm
        action={updateEmployeeAction}
        submitLabel="Save employee"
        id={employee.id}
        redirectTo="/employees"
        departments={departments}
        shifts={shifts}
        defaults={employee}
      />
      <Card className="max-w-4xl">
        <p className="text-sm text-slate-600">
          {employee._count.leaveRequests} leave requests · {employee._count.corrections} corrections · {employee._count.anomalies} anomalies
        </p>
        <form action={deleteEmployeeAction} className="mt-4">
          <input type="hidden" name="id" value={employee.id} />
          <input type="hidden" name="redirectTo" value="/employees" />
          <button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
            Delete employee
          </button>
        </form>
      </Card>
    </SettingsShell>
  );
}
