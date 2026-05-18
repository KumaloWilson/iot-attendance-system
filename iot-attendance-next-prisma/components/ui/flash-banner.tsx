"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";

export function FlashBanner() {
  const params = useSearchParams();
  const flash = params.get("flash");
  const tone = params.get("tone") ?? "success";

  const toneClass = useMemo(() => {
    switch (tone) {
      case "error":
        return "border-rose-200 bg-rose-50 text-rose-800";
      case "warning":
        return "border-amber-200 bg-amber-50 text-amber-800";
      case "info":
        return "border-sky-200 bg-sky-50 text-sky-800";
      case "success":
      default:
        return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }
  }, [tone]);

  if (!flash) return null;

  return (
    <div className={clsx("mx-4 mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold lg:mx-8", toneClass)}>
      {flash}
    </div>
  );
}
