import Link from "next/link";
import { UserRole } from "@prisma/client";
import { CorrectionRequestForm } from "@/components/operations/correction-request-form";
import { OperationsShell } from "@/components/operations/operations-shell";
import { createCorrectionRequestAction } from "../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function NewCorrectionRequestPage() {
  await requirePageRole(UserRole.MANAGER);

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  });

  return (
    <OperationsShell
      activeHref="/operations/corrections/new"
      title="Create Correction Request"
      description="Submit a correction request through a dedicated workflow form."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <CorrectionRequestForm action={createCorrectionRequestAction} employees={employees} redirectTo="/operations" />
    </OperationsShell>
  );
}
