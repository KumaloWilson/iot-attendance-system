import Link from "next/link";
import { CorrectionRequestStatus, LeaveRequestStatus, UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { OperationsShell } from "@/components/operations/operations-shell";
import { requirePageRole } from "@/lib/authorization";
import { getOpenNotifications, getStakeholderSummaries, syncDeviceOfflineAlerts } from "@/lib/operations";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getWorkflowStage(item: {
  status: LeaveRequestStatus | CorrectionRequestStatus;
  managerReviewedAt: Date | null;
  reviewedAt: Date | null;
  appliedAt?: Date | null;
}) {
  if (item.status === "REJECTED") return "Rejected";
  if ("appliedAt" in item && item.appliedAt) return "Applied";
  if (item.reviewedAt) return "HR finalized";
  if (item.managerReviewedAt) return "Awaiting HR";
  return "Awaiting manager";
}

const roleRank: Record<UserRole, number> = {
  VIEWER: 0,
  MANAGER: 1,
  HR_ADMIN: 2,
  SUPER_ADMIN: 3
};

export default async function OperationsPage({
  searchParams
}: {
  searchParams?: { q?: string; stage?: string };
}) {
  const auth = await requirePageRole(UserRole.MANAGER);
  const canManageEnrollment = roleRank[auth.role] >= roleRank[UserRole.HR_ADMIN];
  const q = searchParams?.q?.trim().toLowerCase() ?? "";
  const stageFilter = searchParams?.stage?.trim() ?? "";

  await syncDeviceOfflineAlerts();

  const [leaveRequests, corrections, notifications, scans, stakeholders] = await Promise.all([
    prisma.leaveRequest.findMany({
      include: { employee: true, managerReviewedByUser: true, reviewedByUser: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12
    }),
    prisma.attendanceCorrection.findMany({
      include: { employee: true, managerReviewedByUser: true, reviewedByUser: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 12
    }),
    getOpenNotifications(12),
    prisma.enrollmentScan.findMany({
      include: { device: true, assignedEmployee: true },
      orderBy: { scannedAt: "desc" },
      take: 12
    }),
    getStakeholderSummaries()
  ]);

  const filteredLeaveRequests = leaveRequests.filter((leave) => {
    const stage = getWorkflowStage(leave);
    const matchesQuery = !q || [
      leave.employee.firstName,
      leave.employee.lastName,
      leave.employee.employeeNo,
      leave.reason,
      leave.type
    ].join(" ").toLowerCase().includes(q);
    const matchesStage = !stageFilter || stage === stageFilter;
    return matchesQuery && matchesStage;
  });

  const filteredCorrections = corrections.filter((correction) => {
    const stage = getWorkflowStage(correction);
    const matchesQuery = !q || [
      correction.employee.firstName,
      correction.employee.lastName,
      correction.employee.employeeNo,
      correction.reason
    ].join(" ").toLowerCase().includes(q);
    const matchesStage = !stageFilter || stage === stageFilter;
    return matchesQuery && matchesStage;
  });

  const filteredNotifications = notifications.filter((notification) => (
    !q || [notification.title, notification.message, notification.employee?.firstName ?? "", notification.employee?.lastName ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q)
  ));

  const filteredScans = scans.filter((scan) => (
    !q || [scan.uid, scan.device?.name ?? "", scan.assignedEmployee?.firstName ?? "", scan.assignedEmployee?.lastName ?? "", scan.status]
      .join(" ")
      .toLowerCase()
      .includes(q)
  ));

  return (
    <OperationsShell
      activeHref="/operations"
      title="Workflow Center"
      description="Create and review attendance operations through dedicated forms instead of inline editors."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link href="/operations/leave/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">New leave request</Link>
          <Link href="/operations/corrections/new" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">New correction</Link>
        </div>
      }
    >
      <Card>
        <form className="grid gap-3 md:grid-cols-[1.6fr_1fr_auto]">
          <input
            name="q"
            defaultValue={searchParams?.q ?? ""}
            placeholder="Search employees, reasons, alerts, or RFID scans"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
          <select name="stage" defaultValue={stageFilter} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="">All stages</option>
            <option value="Awaiting manager">Awaiting manager</option>
            <option value="Awaiting HR">Awaiting HR</option>
            <option value="HR finalized">HR finalized</option>
            <option value="Applied">Applied</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Filter</button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.values(stakeholders).map((item) => (
          <Card key={item.title}>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-700">{item.title}</p>
            <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Alerts" value={filteredNotifications.length} accent="amber" />
        <MetricCard label="Leave queue" value={filteredLeaveRequests.filter((item) => item.status === "PENDING").length} accent="blue" />
        <MetricCard label="Corrections" value={filteredCorrections.filter((item) => item.status !== "APPLIED").length} accent="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Leave approvals</h2>
            <Link href="/operations/leave/new" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Create</Link>
          </div>
          <div className="mt-4 space-y-3">
            {filteredLeaveRequests.length === 0 ? (
              <EmptyState title="No leave requests match this filter" description="Change the workflow stage or search phrase to inspect a different set of requests." />
            ) : filteredLeaveRequests.map((leave) => (
              <div key={leave.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{leave.employee.firstName} {leave.employee.lastName}</p>
                    <p className="text-sm text-slate-600">{leave.type} · {leave.startDate.toLocaleString()} to {leave.endDate.toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{getWorkflowStage(leave)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{leave.reason}</p>
                <Link href={`/operations/leave/${leave.id}/review`} className="mt-3 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Review request
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Correction approvals</h2>
            <Link href="/operations/corrections/new" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Create</Link>
          </div>
          <div className="mt-4 space-y-3">
            {filteredCorrections.length === 0 ? (
              <EmptyState title="No correction requests match this filter" description="Try a different employee search term or broaden the selected workflow stage." />
            ) : filteredCorrections.map((correction) => (
              <div key={correction.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{correction.employee.firstName} {correction.employee.lastName}</p>
                    <p className="text-sm text-slate-600">{correction.date.toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{getWorkflowStage(correction)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{correction.reason}</p>
                <Link href={`/operations/corrections/${correction.id}/review`} className="mt-3 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Review correction
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Open notifications</h2>
            <Link href="/operations/notifications" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Manage</Link>
          </div>
          <div className="mt-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <EmptyState title="No open alerts match this filter" description="The queue is either clear or your current search term is too narrow." />
            ) : filteredNotifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{notification.title}</p>
                    <p className="text-sm text-slate-600">{notification.message}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{notification.severity}</span>
                </div>
                <Link href={`/operations/notifications/${notification.id}/review`} className="mt-3 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Review alert
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">RFID enrollment</h2>
            {canManageEnrollment ? (
              <Link href="/operations/enrollment/direct" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Direct assign</Link>
            ) : (
              <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500">HR only</span>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {filteredScans.length === 0 ? (
              <EmptyState title="No enrollment scans match this filter" description="Use a broader query to surface pending cards or assigned RFID scans." />
            ) : filteredScans.map((scan) => (
              <div key={scan.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{scan.uid}</p>
                <p className="mt-1 text-xs text-slate-500">{scan.device?.name ?? "Unknown device"} · {scan.scannedAt.toLocaleString()} · {scan.status}</p>
                {scan.status === "PENDING" && canManageEnrollment ? (
                  <Link href={`/operations/enrollment/scans/${scan.id}/assign`} className="mt-3 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                    Assign scan
                  </Link>
                ) : scan.status === "PENDING" ? (
                  <p className="mt-2 text-sm text-slate-600">Pending assignment by HR.</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    Assigned to {scan.assignedEmployee ? `${scan.assignedEmployee.firstName} ${scan.assignedEmployee.lastName}` : "employee"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </OperationsShell>
  );
}
