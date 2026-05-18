import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { OperationsShell } from "@/components/operations/operations-shell";
import { ReviewForm } from "@/components/operations/review-form";
import { Card } from "@/components/ui/card";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { reviewLeaveRequestAction } from "../../../actions";

function isHrRole(role: UserRole) {
  return role === UserRole.HR_ADMIN || role === UserRole.SUPER_ADMIN;
}

export default async function ReviewLeavePage({ params }: { params: { id: string } }) {
  const auth = await requirePageRole(UserRole.MANAGER);

  const leave = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: { employee: true, managerReviewedByUser: true, reviewedByUser: true }
  });

  if (!leave) notFound();

  const approveLabel = !leave.managerReviewedAt && !isHrRole(auth.role) ? "Manager approve" : isHrRole(auth.role) ? "HR finalize" : "Update manager review";

  return (
    <OperationsShell
      activeHref="/operations/leave/new"
      title="Review Leave Request"
      description="Review the leave request in a dedicated approval screen."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <Card className="max-w-3xl">
        <p className="font-semibold text-slate-900">{leave.employee.firstName} {leave.employee.lastName}</p>
        <p className="mt-2 text-sm text-slate-600">{leave.type} · {leave.startDate.toLocaleString()} to {leave.endDate.toLocaleString()}</p>
        <p className="mt-2 text-sm text-slate-600">{leave.reason}</p>
        <p className="mt-2 text-xs text-slate-500">Manager: {leave.managerReviewedByUser?.name ?? "pending"} · HR: {leave.reviewedByUser?.name ?? "pending"}</p>
      </Card>
      <ReviewForm
        action={reviewLeaveRequestAction}
        id={leave.id}
        reviewNotes={leave.reviewNotes}
        approveLabel={approveLabel}
        rejectLabel="Reject"
        redirectTo="/operations"
        disableApprove={leave.status === "REJECTED"}
      />
    </OperationsShell>
  );
}
