import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { deleteEmployee, updateEmployee } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { employee } = await updateEmployee(params.id, body);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employee.id,
    details: { employeeNo: employee.employeeNo, rfidUid: employee.rfidUid, status: employee.status }
  });

  return NextResponse.json({ employee });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(UserRole.SUPER_ADMIN);
  if ("error" in auth) return auth.error;

  const employee = await deleteEmployee(params.id);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "DELETE",
    entityType: "Employee",
    entityId: employee.id,
    details: { employeeNo: employee.employeeNo, rfidUid: employee.rfidUid, status: employee.status }
  });

  return NextResponse.json({ ok: true });
}
