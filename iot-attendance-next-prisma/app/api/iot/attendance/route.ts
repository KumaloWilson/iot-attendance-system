import { AttendanceEventSource } from "@prisma/client";
import { NextResponse } from "next/server";
import { handleIotAttendanceTap } from "@/lib/attendance";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { iotAttendanceSchema } from "@/lib/validators";
import { verifyPassword } from "@/lib/password";

async function isAuthorized(request: Request, deviceCode: string) {
  const env = getEnv();
  const apiKey = request.headers.get("x-api-key");
  if (apiKey && apiKey === env.IOT_API_KEY) {
    return { ok: true, mode: "shared" as const };
  }

  const deviceSecret = request.headers.get("x-device-secret");
  if (!deviceSecret) return { ok: false };

  const device = await prisma.device.findUnique({ where: { deviceCode } });
  if (!device?.secretHash || !device.isActive) return { ok: false };

  const isValid = await verifyPassword(deviceSecret, device.secretHash);
  return { ok: isValid, mode: "device" as const };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = iotAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const env = getEnv();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(
    `${ip}:${parsed.data.deviceCode}`,
    env.DEFAULT_IOT_RATE_LIMIT_MAX,
    env.DEFAULT_IOT_RATE_LIMIT_WINDOW_MS
  );
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded", retryAfterMs: Math.max(0, rate.resetAt - Date.now()) },
      { status: 429 }
    );
  }

  const authorization = await isAuthorized(request, parsed.data.deviceCode);
  if (!authorization.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized device" }, { status: 401 });
  }

  const result = await handleIotAttendanceTap({
    uid: parsed.data.uid,
    deviceCode: parsed.data.deviceCode,
    occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
    rawPayload: body,
    firmwareVersion: parsed.data.firmwareVersion,
    ipAddress: parsed.data.ipAddress,
    signalStrength: parsed.data.signalStrength,
    bootedAt: parsed.data.bootedAt ? new Date(parsed.data.bootedAt) : undefined,
    syncBatchId: parsed.data.syncBatchId,
    idempotencyKey: parsed.data.idempotencyKey,
    source: parsed.data.source ? AttendanceEventSource[parsed.data.source] : undefined
  });

  return NextResponse.json(
    {
      ...result,
      authMode: authorization.mode
    },
    { status: result.httpStatus }
  );
}
