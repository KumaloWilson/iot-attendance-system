import { clsx } from "clsx";

export function MetricCard({
  label,
  value,
  detail,
  accent = "blue"
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  accent?: "blue" | "emerald" | "amber" | "rose" | "slate";
}) {
  const accents = {
    blue: "from-sky-50 to-white text-brand-700 ring-sky-200",
    emerald: "from-emerald-50 to-white text-emerald-700 ring-emerald-200",
    amber: "from-amber-50 to-white text-amber-700 ring-amber-200",
    rose: "from-rose-50 to-white text-rose-700 ring-rose-200",
    slate: "from-slate-100 to-white text-slate-700 ring-slate-200"
  } as const;

  return (
    <div className={clsx("rounded-[1.6rem] bg-gradient-to-br p-[1px] shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] ring-1", accents[accent])}>
      <div className="rounded-[calc(1.6rem-1px)] bg-white/95 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
      </div>
    </div>
  );
}
