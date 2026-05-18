import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ReviewForm({
  action,
  id,
  reviewNotes,
  approveLabel,
  rejectLabel,
  redirectTo,
  disableApprove = false
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  reviewNotes?: string | null;
  approveLabel: string;
  rejectLabel: string;
  redirectTo: string;
  disableApprove?: boolean;
}) {
  return (
    <Card className="max-w-3xl">
      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Review notes</label>
          <textarea
            name="reviewNotes"
            defaultValue={reviewNotes ?? ""}
            className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
        </div>
        <div className="flex gap-3">
          {!disableApprove ? (
            <Button name="status" value="APPROVED" type="submit">
              {approveLabel}
            </Button>
          ) : null}
          <button
            name="status"
            value="REJECTED"
            className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
          >
            {rejectLabel}
          </button>
        </div>
      </form>
    </Card>
  );
}
