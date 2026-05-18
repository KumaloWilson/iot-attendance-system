import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-[1.75rem] border border-white/70 bg-white/92 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.42)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}
