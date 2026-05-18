import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/password";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid account enumeration.
  if (!user) return NextResponse.json({ ok: true });

  const { token, tokenHash } = createResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: tokenHash, resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 30) }
  });

  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: "REQUEST_PASSWORD_RESET",
    entityType: "User",
    entityId: user.id
  });

  const resetUrl = `${getEnv().APP_BASE_URL}/reset-password?token=${token}`;
  console.log("Password reset URL:", resetUrl);
  return NextResponse.json({ ok: true, resetUrl });
}
