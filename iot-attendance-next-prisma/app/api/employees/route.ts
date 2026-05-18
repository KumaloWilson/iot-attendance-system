import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { createEmployee } from "@/lib/admin";
import { writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireRole(UserRole.VIEWER);
  if ("error" in auth) return auth.error;

  const employees = await prisma.employee.findMany({
    include: { department: true, shift: true },
    orderBy: [{ status: "asc" }, { firstName: "asc" }]
  });
  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const auth = await requireRole(UserRole.HR_ADMIN);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });

  const { employee } = await createEmployee(parsed.data);

  await writeAuditLog({
    actorUserId: (auth.session.user as { id?: string }).id ?? null,
    actorEmail: auth.session.user.email ?? null,
    action: "CREATE",
    entityType: "Employee",
    entityId: employee.id,
    details: {
      employeeNo: employee.employeeNo,
      rfidUid: employee.rfidUid
    }
  });

  return NextResponse.json({ employee }, { status: 201 });
}
