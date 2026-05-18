import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { enrollmentScanSchema } from "@/lib/validators";
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
  const parsed = enrollmentScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const env = getEnv();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rate = checkRateLimit(
    `${ip}:enrollment:${parsed.data.deviceCode}`,
    env.DEFAULT_IOT_RATE_LIMIT_MAX,
    env.DEFAULT_IOT_RATE_LIMIT_WINDOW_MS
  );
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429 });
  }

  const authorization = await isAuthorized(request, parsed.data.deviceCode);
  if (!authorization.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized device" }, { status: 401 });
  }

  const device = await prisma.device.findUnique({ where: { deviceCode: parsed.data.deviceCode } });
  const scan = await prisma.enrollmentScan.create({
    data: {
      uid: parsed.data.uid.trim().toUpperCase(),
      deviceId: device?.id ?? null,
      scannedAt: parsed.data.scannedAt ? new Date(parsed.data.scannedAt) : new Date(),
      notes: parsed.data.notes || null,
      rawPayload: body
    }
  });

  return NextResponse.json({
    ok: true,
    authMode: authorization.mode,
    enrollmentScanId: scan.id,
    uid: scan.uid,
    status: scan.status
  });
}
