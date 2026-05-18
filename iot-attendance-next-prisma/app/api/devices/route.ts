import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { createDevice } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const devices = await prisma.device.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });
  return NextResponse.json({ devices });
}

export async function POST(request: Request) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { device } = await createDevice(body);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "CREATE",
    entityType: "Device",
    entityId: device.id,
    details: { deviceCode: device.deviceCode, name: device.name }
  });

  return NextResponse.json({ device }, { status: 201 });
}
