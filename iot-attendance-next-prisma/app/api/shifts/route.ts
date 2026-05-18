import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { createShift } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const shifts = await prisma.shift.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ shifts });
}

export async function POST(request: Request) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { shift } = await createShift(body);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "CREATE",
    entityType: "Shift",
    entityId: shift.id,
    details: { name: shift.name }
  });

  return NextResponse.json({ shift }, { status: 201 });
}
