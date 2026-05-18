import Link from "next/link";
import { UserRole } from "@prisma/client";
import { DirectEnrollmentForm } from "@/components/operations/direct-enrollment-form";
import { OperationsShell } from "@/components/operations/operations-shell";
import { enrollEmployeeCardAction } from "../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function DirectEnrollmentPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
  });

  return (
    <OperationsShell
      activeHref="/operations/enrollment/direct"
      title="Direct RFID Assignment"
      description="Assign a UID directly to an employee from a dedicated enrollment form."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <DirectEnrollmentForm action={enrollEmployeeCardAction} employees={employees} redirectTo="/operations" />
    </OperationsShell>
  );
}
