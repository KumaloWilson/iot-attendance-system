import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" }
  });

  return (
    <SettingsShell
      activeHref="/settings/departments"
      title="Departments"
      description="Review and maintain department records through dedicated create and edit pages."
      actions={<Link href="/settings/departments/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Add department</Link>}
    >
      <Card>
        <div className="space-y-3">
          {departments.map((department) => (
            <div key={department.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-slate-900">{department.name}</p>
                <p className="text-sm text-slate-500">{department._count.employees} employees assigned</p>
              </div>
              <Link href={`/settings/departments/${department.id}/edit`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Edit
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </SettingsShell>
  );
}
