import Link from "next/link";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHero } from "@/components/ui/page-hero";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const roleRank: Record<UserRole, number> = {
  VIEWER: 0,
  MANAGER: 1,
  HR_ADMIN: 2,
  SUPER_ADMIN: 3
};

export default async function EmployeesPage({
  searchParams
}: {
  searchParams?: { q?: string; status?: string; department?: string };
}) {
  const session = await getServerSession(authOptions);
  const sessionRole = ((session?.user as { role?: UserRole } | undefined)?.role ?? UserRole.VIEWER) as UserRole;
  const canManageEmployees = roleRank[sessionRole] >= roleRank[UserRole.HR_ADMIN];
  const q = searchParams?.q?.trim() ?? "";
  const statusFilter = searchParams?.status?.trim() ?? "";
  const departmentFilter = searchParams?.department?.trim() ?? "";

  const employees = await prisma.employee.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter as never } : {}),
      ...(departmentFilter ? { department: { name: departmentFilter } } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { employeeNo: { contains: q, mode: "insensitive" } },
              { rfidUid: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      department: true,
      shift: true,
      _count: { select: { leaveRequests: true, anomalies: true, corrections: true } }
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }]
  });

  const active = employees.filter((employee) => employee.status === "ACTIVE").length;
  const suspended = employees.filter((employee) => employee.status === "SUSPENDED").length;
  const departmentNames = Array.from(new Set(employees.map((employee) => employee.department?.name).filter(Boolean))) as string[];
  const departments = departmentNames.length;
  const shifts = new Set(employees.map((employee) => employee.shift?.name).filter(Boolean)).size;

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="People"
        title="Employee Management"
        description="Workforce roster with RFID mapping, department assignment, shift policy mapping, and dedicated create/edit management flows."
        aside={
          <div className="flex justify-start lg:justify-end">
            {canManageEmployees ? (
              <Link href="/employees/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">
                Add employee
              </Link>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500">
                Viewer mode
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total employees" value={employees.length} accent="slate" />
        <MetricCard label="Active" value={active} accent="emerald" />
        <MetricCard label="Departments" value={departments} accent="blue" />
        <MetricCard label="Shift templates" value={shifts} accent="amber" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Employee directory</h2>
            {canManageEmployees ? (
              <Link href="/employees/new" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                New employee
              </Link>
            ) : null}
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]">
            <input name="q" defaultValue={q} placeholder="Search by name, employee number, or RFID" className="rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <select name="status" defaultValue={statusFilter} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TERMINATED">Terminated</option>
            </select>
            <select name="department" defaultValue={departmentFilter} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="">All departments</option>
              {departmentNames.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Filter</button>
          </form>
          <div className="mt-4 overflow-x-auto">
            {employees.length === 0 ? (
              <EmptyState
                title="No employees configured"
                description="Create employees, assign RFID cards, and map departments or shifts to populate the workforce directory."
              />
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2">Employee</th>
                    <th>No.</th>
                    <th>RFID UID</th>
                    <th>Department</th>
                    <th>Shift</th>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-t border-slate-100">
                      <td className="py-3 font-semibold">
                        {employee.firstName} {employee.lastName}
                        <div className="text-xs font-normal text-slate-500">{employee.email ?? "No email set"}</div>
                      </td>
                      <td>{employee.employeeNo}</td>
                      <td>{employee.rfidUid}</td>
                      <td>{employee.department?.name ?? "-"}</td>
                      <td>{employee.shift?.name ?? "-"}</td>
                      <td className="text-xs text-slate-500">
                        {employee._count.leaveRequests} leave · {employee._count.corrections} corrections · {employee._count.anomalies} alerts
                      </td>
                      <td>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${employee.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : employee.status === "SUSPENDED" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td>{canManageEmployees ? <Link href={`/employees/${employee.id}/edit`} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Edit</Link> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-black">Deployment summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Active cards</p>
                <p className="mt-1">{active} employees can authenticate on RFID devices today.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Suspended workers</p>
                <p className="mt-1">{suspended} records are blocked from successful attendance taps.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Coverage structure</p>
                <p className="mt-1">{departments} departments and {shifts} shift definitions are assigned in the demo dataset.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
