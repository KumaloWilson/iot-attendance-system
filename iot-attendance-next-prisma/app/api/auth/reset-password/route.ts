import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword, hashResetToken } from "@/lib/password";

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (!token || password.length < 8) return NextResponse.json({ ok: false, error: "Invalid reset request" }, { status: 400 });

  const tokenHash = hashResetToken(token);
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiry: { gt: new Date() } }
  });
  if (!user) return NextResponse.json({ ok: false, error: "Reset token invalid or expired" }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), resetTokenHash: null, resetTokenExpiry: null }
  });

  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "RESET_PASSWORD",
    entityType: "User",
    entityId: user.id
  });

  return NextResponse.redirect(new URL("/login", request.url));
}
