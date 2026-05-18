import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { deleteDevice, updateDevice } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { device } = await updateDevice(params.id, body);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "UPDATE",
    entityType: "Device",
    entityId: device.id,
    details: { deviceCode: device.deviceCode, name: device.name, isActive: device.isActive }
  });

  return NextResponse.json({ device });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(UserRole.SUPER_ADMIN);
  if ("error" in auth) return auth.error;

  const device = await deleteDevice(params.id);
  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "DELETE",
    entityType: "Device",
    entityId: device.id,
    details: { deviceCode: device.deviceCode, name: device.name }
  });

  return NextResponse.json({ ok: true });
}
