import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(29,78,216,0.85)] transition hover:-translate-y-0.5 hover:bg-brand-500 disabled:translate-y-0 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
