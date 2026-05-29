"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function FlashBanner() {
  const params = useSearchParams();
  const flash = params.get("flash");
  const tone = params.get("tone") ?? "success";

  const config = useMemo(() => {
    switch (tone) {
      case "error":
        return {
          className: "border-red-200 bg-red-50 text-red-800",
          Icon: AlertCircle,
          iconClass: "text-red-500"
        };
      case "warning":
        return {
          className: "border-amber-200 bg-amber-50 text-amber-800",
          Icon: AlertTriangle,
          iconClass: "text-amber-500"
        };
      case "info":
        return {
          className: "border-brand-200 bg-brand-50 text-brand-800",
          Icon: Info,
          iconClass: "text-brand-500"
        };
      case "success":
      default:
        return {
          className: "border-emerald-200 bg-emerald-50 text-emerald-800",
          Icon: CheckCircle2,
          iconClass: "text-emerald-500"
        };
    }
  }, [tone]);

  if (!flash) return null;

  const { className, Icon, iconClass } = config;

  return (
    <div className={clsx("mx-4 mt-4 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold lg:mx-8", className)}>
      <Icon className={clsx("h-4 w-4 flex-shrink-0", iconClass)} />
      {flash}
    </div>
  );
}
