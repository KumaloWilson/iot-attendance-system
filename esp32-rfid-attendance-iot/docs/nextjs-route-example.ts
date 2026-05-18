// Example Next.js App Router endpoint shape matching the current backend.
// Real implementation lives in:
// iot-attendance-next-prisma/app/api/iot/attendance/route.ts

import { NextRequest, NextResponse } from "next/server";

type TapRequest = {
  uid: string;
  deviceCode: string;
  occurredAt?: string;
};

export async function POST(req: NextRequest) {
  const deviceSecret = req.headers.get("x-device-secret");
  if (!deviceSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized device" }, { status: 401 });
  }

  const body = (await req.json()) as TapRequest;

  if (!body.uid || !body.deviceCode) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    action: "CHECK_IN",
    authMode: "device",
    employee: {
      employeeNo: "EMP-001",
      name: "Wilson Kumalo"
    },
    message: "Checked in"
  });
}
