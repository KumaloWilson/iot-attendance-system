export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">No records</p>
      <h3 className="mt-3 text-lg font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
