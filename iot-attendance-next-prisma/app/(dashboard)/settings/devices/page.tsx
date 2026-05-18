import Link from "next/link";
import { UserRole } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { deviceHealthTone, formatDeviceMode, getDeviceHealth } from "@/lib/device-health";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  const devices = await prisma.device.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });

  return (
    <SettingsShell
      activeHref="/settings/devices"
      title="Devices"
      description="Provision and maintain RFID terminals through dedicated device management forms."
      actions={<Link href="/settings/devices/new" className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white">Add device</Link>}
    >
      <Card>
        <div className="space-y-3">
          {devices.map((device) => (
            <div key={device.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{device.name}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${deviceHealthTone(getDeviceHealth(device))}`}>
                    {getDeviceHealth(device)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {device.deviceCode} · {formatDeviceMode(device.mode)} · {device._count.events} events
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {device.location ?? "No location"} · Firmware {device.firmwareVersion ?? "unknown"}
                </p>
              </div>
              <Link href={`/settings/devices/${device.id}/edit`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                Edit
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </SettingsShell>
  );
}
