import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { ScanAssignmentForm } from "@/components/operations/scan-assignment-form";
import { OperationsShell } from "@/components/operations/operations-shell";
import { Card } from "@/components/ui/card";
import { assignEnrollmentScanAction } from "../../../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function AssignScanPage({ params }: { params: { id: string } }) {
  await requirePageRole(UserRole.HR_ADMIN);

  const [scan, employees] = await Promise.all([
    prisma.enrollmentScan.findUnique({
      where: { id: params.id },
      include: { device: true, assignedEmployee: true }
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    })
  ]);

  if (!scan) notFound();

  return (
    <OperationsShell
      activeHref="/operations/enrollment/direct"
      title="Assign Enrollment Scan"
      description="Map a scanned RFID card to an employee through a dedicated assignment flow."
      actions={<Link href="/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to operations</Link>}
    >
      <Card className="max-w-3xl">
        <p className="font-semibold text-slate-900">{scan.uid}</p>
        <p className="mt-2 text-sm text-slate-600">{scan.device?.name ?? "Unknown device"} · {scan.scannedAt.toLocaleString()} · {scan.status}</p>
      </Card>
      <ScanAssignmentForm action={assignEnrollmentScanAction} scanId={scan.id} employees={employees} redirectTo="/operations" />
    </OperationsShell>
  );
}
