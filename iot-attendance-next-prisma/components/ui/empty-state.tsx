import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <Inbox className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">
        No records found
      </p>
      <h3 className="mt-2 text-base font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
