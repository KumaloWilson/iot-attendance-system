import Link from "next/link";
import { UserRole } from "@prisma/client";
import { DeviceForm } from "@/components/settings/device-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { createDeviceAction } from "../../actions";

export default async function NewDevicePage() {
  await requirePageRole(UserRole.HR_ADMIN);

  return (
    <SettingsShell
      activeHref="/settings/devices"
      title="Add Device"
      description="Create and provision a terminal through a dedicated device form."
      actions={<Link href="/settings/devices" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to devices</Link>}
    >
      <DeviceForm action={createDeviceAction} submitLabel="Create device" redirectTo="/settings/devices" requireSecret />
    </SettingsShell>
  );
}
