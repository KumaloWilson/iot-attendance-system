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
  accent?: "blue" | "gold" | "emerald" | "amber" | "rose" | "slate";
}) {
  const accents = {
    blue: {
      wrapper: "border-brand-100 bg-white",
      bar: "bg-brand-700",
      label: "text-brand-700",
      value: "text-slate-950",
      indicator: "bg-brand-100"
    },
    gold: {
      wrapper: "border-gold-200 bg-white",
      bar: "bg-gold-500",
      label: "text-gold-700",
      value: "text-slate-950",
      indicator: "bg-gold-100"
    },
    emerald: {
      wrapper: "border-emerald-100 bg-white",
      bar: "bg-emerald-600",
      label: "text-emerald-700",
      value: "text-slate-950",
      indicator: "bg-emerald-100"
    },
    amber: {
      wrapper: "border-amber-100 bg-white",
      bar: "bg-amber-500",
      label: "text-amber-700",
      value: "text-slate-950",
      indicator: "bg-amber-100"
    },
    rose: {
      wrapper: "border-rose-100 bg-white",
      bar: "bg-rose-600",
      label: "text-rose-700",
      value: "text-slate-950",
      indicator: "bg-rose-100"
    },
    slate: {
      wrapper: "border-slate-200 bg-white",
      bar: "bg-slate-400",
      label: "text-slate-500",
      value: "text-slate-950",
      indicator: "bg-slate-100"
    }
  } as const;

  const style = accents[accent];

  return (
    <div className={clsx("relative overflow-hidden rounded-2xl border p-5 shadow-sm", style.wrapper)}>
      {/* Left accent bar */}
      <div className={clsx("absolute left-0 top-0 h-full w-1 rounded-l-2xl", style.bar)} />
      <div className="pl-3">
        <p className={clsx("text-[10px] font-bold uppercase tracking-[0.25em]", style.label)}>
          {label}
        </p>
        <p className={clsx("mt-2.5 text-3xl font-black tracking-tight", style.value)}>{value}</p>
        {detail ? (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
