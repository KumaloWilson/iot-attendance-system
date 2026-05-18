import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { DeviceForm } from "@/components/settings/device-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Card } from "@/components/ui/card";
import { deviceHealthTone, formatDeviceMode, getDeviceHealth } from "@/lib/device-health";
import { deleteDeviceAction, updateDeviceAction } from "../../../actions";
import { requirePageRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function EditDevicePage({ params }: { params: { id: string } }) {
  await requirePageRole(UserRole.HR_ADMIN);

  const device = await prisma.device.findUnique({
    where: { id: params.id },
    include: { _count: { select: { events: true } } }
  });

  if (!device) notFound();

  return (
    <SettingsShell
      activeHref="/settings/devices"
      title={`Edit ${device.name}`}
      description="Update terminal configuration, rotation secrets, and active state in a dedicated edit form."
      actions={<Link href="/settings/devices" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to devices</Link>}
    >
      <DeviceForm
        action={updateDeviceAction}
        submitLabel="Save device"
        id={device.id}
        redirectTo="/settings/devices"
        defaults={device}
        requireSecret={false}
      />
      <Card className="max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${deviceHealthTone(getDeviceHealth(device))}`}>
            {getDeviceHealth(device)}
          </span>
          <span className="text-sm text-slate-600">{formatDeviceMode(device.mode)}</span>
          <span className="text-sm text-slate-600">{device._count.events} events recorded</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Last seen {device.lastSeenAt ? device.lastSeenAt.toLocaleString() : "never"} · Firmware {device.firmwareVersion ?? "unknown"}
        </p>
        {device.lastErrorMessage ? <p className="mt-2 text-sm text-rose-700">{device.lastErrorMessage}</p> : null}
        <form action={deleteDeviceAction} className="mt-4">
          <input type="hidden" name="id" value={device.id} />
          <input type="hidden" name="redirectTo" value="/settings/devices" />
          <button className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
            Delete device
          </button>
        </form>
      </Card>
    </SettingsShell>
  );
}
