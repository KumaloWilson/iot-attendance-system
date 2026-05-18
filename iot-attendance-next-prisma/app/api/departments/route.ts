import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { createDepartment } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" }
  });

  return NextResponse.json({ departments });
}

export async function POST(request: Request) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { department } = await createDepartment(body, {
    id: (auth.session.user as { id?: string }).id,
    email: auth.session.user.email ?? null,
    role: auth.role
  });

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "CREATE",
    entityType: "Department",
    entityId: department.id,
    details: { name: department.name }
  });

  return NextResponse.json({ department }, { status: 201 });
}
