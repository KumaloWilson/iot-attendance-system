import Link from "next/link";
import { UserRole } from "@prisma/client";
import { LeaveRequestForm } from "@/components/operations/leave-request-form";
import { OperationsShell } from "@/components/operations/operations-shell";
import { createLeaveRequestAction } from "../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function NewLeaveRequestPage() {
  await requirePageRole(UserRole.MANAGER);

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  });

  return (
    <OperationsShell
      activeHref="/operations/leave/new"
      title="Create Leave Request"
      description="Submit a leave request through a dedicated workflow form."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <LeaveRequestForm action={createLeaveRequestAction} employees={employees} redirectTo="/operations" />
    </OperationsShell>
  );
}
