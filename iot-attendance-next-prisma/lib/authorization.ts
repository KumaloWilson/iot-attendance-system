import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const roleRank: Record<UserRole, number> = {
  VIEWER: 0,
  MANAGER: 1,
  HR_ADMIN: 2,
  SUPER_ADMIN: 3
};

type SessionWithUser = Session & {
  user: NonNullable<Session["user"]>;
};

export async function requireRole(role: UserRole) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const sessionRole = ((session.user as { role?: UserRole }).role ?? UserRole.VIEWER) as UserRole;
  if (roleRank[sessionRole] < roleRank[role]) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session: session as SessionWithUser, role: sessionRole };
}

export async function requirePageRole(role: UserRole) {
  const auth = await requireRole(role);
  if ("error" in auth) {
    redirect("/dashboard?flash=You do not have access to that page&tone=error");
  }

  return auth;
}
