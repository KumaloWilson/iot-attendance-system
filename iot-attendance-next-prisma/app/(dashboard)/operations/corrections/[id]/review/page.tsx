import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { OperationsShell } from "@/components/operations/operations-shell";
import { ReviewForm } from "@/components/operations/review-form";
import { Card } from "@/components/ui/card";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { reviewCorrectionRequestAction } from "../../../actions";

function isHrRole(role: UserRole) {
  return role === UserRole.HR_ADMIN || role === UserRole.SUPER_ADMIN;
}

export default async function ReviewCorrectionPage({ params }: { params: { id: string } }) {
  const auth = await requirePageRole(UserRole.MANAGER);

  const correction = await prisma.attendanceCorrection.findUnique({
    where: { id: params.id },
    include: { employee: true, managerReviewedByUser: true, reviewedByUser: true }
  });

  if (!correction) notFound();

  const approveLabel = !correction.managerReviewedAt && !isHrRole(auth.role)
    ? "Manager approve"
    : isHrRole(auth.role)
      ? "HR approve & apply"
      : "Update manager review";

  return (
    <OperationsShell
      activeHref="/operations/corrections/new"
      title="Review Correction Request"
      description="Review the attendance correction in a dedicated approval screen."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <Card className="max-w-3xl">
        <p className="font-semibold text-slate-900">{correction.employee.firstName} {correction.employee.lastName}</p>
        <p className="mt-2 text-sm text-slate-600">{correction.date.toLocaleString()}</p>
        <p className="mt-2 text-sm text-slate-600">In {correction.requestedCheckIn?.toLocaleString() ?? "-"} · Out {correction.requestedCheckOut?.toLocaleString() ?? "-"}</p>
        <p className="mt-2 text-sm text-slate-600">{correction.reason}</p>
        <p className="mt-2 text-xs text-slate-500">Manager: {correction.managerReviewedByUser?.name ?? "pending"} · HR: {correction.reviewedByUser?.name ?? "pending"}</p>
      </Card>
      <ReviewForm
        action={reviewCorrectionRequestAction}
        id={correction.id}
        reviewNotes={correction.reviewNotes}
        approveLabel={approveLabel}
        rejectLabel="Reject"
        redirectTo="/operations"
        disableApprove={correction.status === "REJECTED" || correction.status === "APPLIED"}
      />
    </OperationsShell>
  );
}
