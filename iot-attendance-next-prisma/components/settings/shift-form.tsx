import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ShiftDefaults = {
  name?: string;
  startTime?: string;
  endTime?: string;
  graceMinutes?: number;
  expectedMinutes?: number;
  halfDayMinutes?: number;
  overtimeAfterMinutes?: number;
  missedCheckoutGraceMinutes?: number;
  weekendAttendanceEnabled?: boolean;
};

export function ShiftForm({
  action,
  submitLabel,
  defaults,
  id,
  redirectTo
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaults?: ShiftDefaults;
  id?: string;
  redirectTo: string;
}) {
  return (
    <Card className="max-w-3xl">
      <form action={action} className="grid gap-4">
        {id ? <input type="hidden" name="id" value={id} /> : null}
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Shift name</label>
          <input
            name="name"
            required
            defaultValue={defaults?.name ?? ""}
            placeholder="Day 08:00-17:00"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Start time</label>
            <input name="startTime" required defaultValue={defaults?.startTime ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">End time</label>
            <input name="endTime" required defaultValue={defaults?.endTime ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Grace minutes</label>
            <input name="graceMinutes" type="number" min="0" defaultValue={defaults?.graceMinutes ?? 15} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Expected minutes</label>
            <input name="expectedMinutes" type="number" min="1" defaultValue={defaults?.expectedMinutes ?? 480} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Half-day threshold</label>
            <input name="halfDayMinutes" type="number" min="1" defaultValue={defaults?.halfDayMinutes ?? 240} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Overtime after minutes</label>
            <input name="overtimeAfterMinutes" type="number" min="1" defaultValue={defaults?.overtimeAfterMinutes ?? 540} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Missed checkout grace minutes</label>
          <input
            name="missedCheckoutGraceMinutes"
            type="number"
            min="0"
            defaultValue={defaults?.missedCheckoutGraceMinutes ?? 180}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="weekendAttendanceEnabled" defaultChecked={defaults?.weekendAttendanceEnabled ?? false} />
          Weekend attendance required
        </label>
        <div className="flex gap-3">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
