import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DepartmentForm({
  action,
  submitLabel,
  defaultName = "",
  id,
  redirectTo
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaultName?: string;
  id?: string;
  redirectTo: string;
}) {
  return (
    <Card className="max-w-2xl">
      <form action={action} className="space-y-4">
        {id ? <input type="hidden" name="id" value={id} /> : null}
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Department name</label>
          <input
            name="name"
            required
            defaultValue={defaultName}
            placeholder="Operations"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Card>
  );
}
