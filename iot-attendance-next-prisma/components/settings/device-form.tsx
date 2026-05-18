import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DeviceDefaults = {
  deviceCode?: string;
  name?: string;
  location?: string | null;
  mode?: "ENTRY_EXIT" | "ENTRY_ONLY" | "EXIT_ONLY";
  isActive?: boolean;
};

export function DeviceForm({
  action,
  submitLabel,
  defaults,
  id,
  redirectTo,
  requireSecret
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: DeviceDefaults;
  id?: string;
  redirectTo: string;
  requireSecret: boolean;
}) {
  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4">
        {id ? <input type="hidden" name="id" value={id} /> : null}
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Device code</label>
            <input name="deviceCode" required defaultValue={defaults?.deviceCode ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Device name</label>
            <input name="name" required defaultValue={defaults?.name ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Location</label>
          <input name="location" defaultValue={defaults?.location ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Mode</label>
          <select name="mode" defaultValue={defaults?.mode ?? "ENTRY_EXIT"} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
            <option value="ENTRY_EXIT">Entry + exit</option>
            <option value="ENTRY_ONLY">Entry only</option>
            <option value="EXIT_ONLY">Exit only</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">{requireSecret ? "Device secret" : "Device secret override"}</label>
          <input
            name="secret"
            type="password"
            required={requireSecret}
            placeholder={requireSecret ? "Device secret" : "Leave blank to keep current secret"}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="isActive" defaultChecked={defaults?.isActive ?? true} />
          Active
        </label>
        <div className="flex gap-3">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
