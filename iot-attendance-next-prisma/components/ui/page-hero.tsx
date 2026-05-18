import { clsx } from "clsx";

export function PageHero({
  eyebrow,
  title,
  description,
  aside,
  className
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur xl:p-8", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(29,78,216,0.10),transparent_28%)]" />
      <div className="relative grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-700">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </div>
  );
}
