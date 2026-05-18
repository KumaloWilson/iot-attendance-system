import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ShiftForm } from "@/components/settings/shift-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requirePageRole } from "@/lib/authorization";
import { createShiftAction } from "../../actions";

export default async function NewShiftPage() {
  await requirePageRole(UserRole.HR_ADMIN);

  return (
    <SettingsShell
      activeHref="/settings/shifts"
      title="Add Shift"
      description="Create a shift and define its attendance policy in a dedicated configuration form."
      actions={<Link href="/settings/shifts" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to shifts</Link>}
    >
      <ShiftForm action={createShiftAction} submitLabel="Create shift" redirectTo="/settings/shifts" />
    </SettingsShell>
  );
}
