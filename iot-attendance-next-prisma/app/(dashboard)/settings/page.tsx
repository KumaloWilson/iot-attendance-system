import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  const [departmentCount, shiftCount, deviceCount, auditLogs, enrollmentScans] = await Promise.all([
    prisma.department.count(),
    prisma.shift.count(),
    prisma.device.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.enrollmentScan.findMany({ include: { assignedEmployee: true }, orderBy: { scannedAt: "desc" }, take: 8 })
  ]);

  return (
    <SettingsShell
      activeHref="/settings"
      title="Settings"
      description="Manage departments, shift policy, device fleet controls, and audit visibility through dedicated configuration workflows."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Departments" value={departmentCount} accent="slate" />
        <MetricCard label="Shift templates" value={shiftCount} accent="blue" />
        <MetricCard label="Devices" value={deviceCount} accent="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-black">Departments</h2>
          <p className="mt-2 text-sm text-slate-600">Create and maintain organization structure in a dedicated management flow.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/settings/departments" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Manage</Link>
            <Link href="/settings/departments/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Add new</Link>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-black">Shifts</h2>
          <p className="mt-2 text-sm text-slate-600">Maintain attendance policy with dedicated shift create and edit forms.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/settings/shifts" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Manage</Link>
            <Link href="/settings/shifts/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Add new</Link>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-black">Devices</h2>
          <p className="mt-2 text-sm text-slate-600">Provision terminals, rotate secrets, and manage fleet configuration through dedicated forms.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/settings/devices" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Manage</Link>
            <Link href="/settings/devices/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Add new</Link>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-black">Recent enrollment scans</h2>
        <div className="mt-4 space-y-3">
          {enrollmentScans.map((scan) => (
            <div key={scan.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">{scan.uid}</p>
                <p className="text-xs text-slate-500">{scan.status}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {scan.assignedEmployee ? `${scan.assignedEmployee.firstName} ${scan.assignedEmployee.lastName}` : "Awaiting assignment"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{scan.scannedAt.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-black">Recent admin activity</h2>
        <div className="mt-4 space-y-3">
          {auditLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-900">
                  {log.action} {log.entityType}
                </p>
                <p className="text-xs text-slate-500">{log.createdAt.toLocaleString()}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{log.actorEmail ?? "system"}</p>
              {log.details ? (
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </SettingsShell>
  );
}
