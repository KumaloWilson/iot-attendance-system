"use client";

import { Bell, LogOut, Zap } from "lucide-react";
import Image from "next/image";
import { signOut } from "next-auth/react";

const roleLabels: Record<string, string> = {
  VIEWER: "Viewer",
  MANAGER: "Manager",
  HR_ADMIN: "HR Administrator",
  SUPER_ADMIN: "Super Administrator"
};

const roleBadgeColors: Record<string, string> = {
  VIEWER: "bg-slate-100 text-slate-600 ring-slate-200",
  MANAGER: "bg-brand-50 text-brand-700 ring-brand-200",
  HR_ADMIN: "bg-gold-50 text-gold-700 ring-gold-200",
  SUPER_ADMIN: "bg-brand-700 text-white ring-brand-600"
};

export function Header({
  name,
  email,
  role,
  notificationCount = 0,
  updatedAt
}: {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  notificationCount?: number;
  updatedAt?: string | null;
}) {
  const roleKey = (role ?? "VIEWER") as keyof typeof roleLabels;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      {/* Gold top accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-brand-700 via-gold-500 to-brand-700" />

      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        {/* Left: Brand identity + breadcrumb */}
        <div className="flex items-center gap-4">
          {/* Mobile logo (visible when sidebar hidden) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
              <Image src="/zesa-logo.png" alt="ZESA" width={28} height={28} className="object-contain" />
            </div>
            <span className="text-sm font-bold text-brand-700">ZESA Holdings</span>
          </div>

          {/* System name */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700">
                ZESA Holdings
              </p>
              <span className="text-slate-300">·</span>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                ZETDC Attendance Management System
              </p>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Live data ·{" "}
              {updatedAt
                ? `Updated ${new Date(updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}`
                : "Refreshing..."}
            </p>
          </div>
        </div>

        {/* Right: Actions + user info */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold-500 text-[9px] font-bold text-brand-900">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200" />

          {/* User info */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 transition hover:border-brand-300">
            {/* Avatar */}
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
              {name ? name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-slate-900">
                {name ?? "User"}
              </p>
              <p className="text-[10px] leading-tight text-slate-500">{email ?? ""}</p>
            </div>
            {/* Role badge */}
            <span
              className={`hidden items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 md:inline-flex ${roleBadgeColors[roleKey] ?? roleBadgeColors.VIEWER}`}
            >
              {roleLabels[roleKey] ?? roleKey}
            </span>
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
