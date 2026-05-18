import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: (input.details as Prisma.InputJsonValue | undefined) ?? undefined
    }
  });
}
