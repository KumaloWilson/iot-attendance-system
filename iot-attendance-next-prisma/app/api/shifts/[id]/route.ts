import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { deleteShift, updateShift } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { shift } = await updateShift(params.id, body);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "UPDATE",
    entityType: "Shift",
    entityId: shift.id,
    details: { name: shift.name }
  });

  return NextResponse.json({ shift });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(UserRole.SUPER_ADMIN);
  if ("error" in auth) return auth.error;

  const shift = await deleteShift(params.id);
  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "DELETE",
    entityType: "Shift",
    entityId: shift.id,
    details: { name: shift.name }
  });

  return NextResponse.json({ ok: true });
}
