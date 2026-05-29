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
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-brand-800 bg-brand-950 p-6 xl:p-8",
        className
      )}
    >
      {/* Background pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(255,255,255,1) 32px, rgba(255,255,255,1) 33px), repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(255,255,255,1) 32px, rgba(255,255,255,1) 33px)"
        }}
      />
      {/* Radial highlight */}
      <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-brand-700/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-24 h-32 w-64 rounded-full bg-gold-500/10 blur-3xl" />

      {/* Gold bottom border accent */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

      <div className="relative grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-end">
        <div>
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-gold-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-400">
              {eyebrow}
            </p>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-300">{description}</p>
        </div>
        {aside ? <div className="relative">{aside}</div> : null}
      </div>
    </div>
  );
}
