"use client";

import { clsx } from "clsx";
import {
  Activity,
  BarChart3,
  BellRing,
  CalendarDays,
  LayoutDashboard,
  Settings2,
  Users,
  View
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "VIEWER" },
  { href: "/employees", label: "Employees", icon: Users, minRole: "VIEWER" },
  { href: "/attendance", label: "Attendance", icon: Activity, minRole: "VIEWER" },
  { href: "/timesheets", label: "Timesheets", icon: CalendarDays, minRole: "VIEWER" },
  { href: "/reports", label: "Reports", icon: BarChart3, minRole: "VIEWER" },
  { href: "/operations", label: "Operations", icon: BellRing, minRole: "MANAGER" },
  { href: "/portal", label: "Self-Service", icon: View, minRole: "VIEWER" },
  { href: "/settings", label: "Settings", icon: Settings2, minRole: "HR_ADMIN" }
];

const roleRank = {
  VIEWER: 0,
  MANAGER: 1,
  HR_ADMIN: 2,
  SUPER_ADMIN: 3
} as const;

export function Sidebar({ role = "VIEWER" }: { role?: string | null }) {
  const pathname = usePathname();
  const visibleLinks = links.filter(
    (link) =>
      roleRank[(role as keyof typeof roleRank) ?? "VIEWER"] >=
      roleRank[link.minRole as keyof typeof roleRank]
  );

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col overflow-y-auto bg-brand-950 lg:flex">
      {/* Gold top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600" />

      {/* Logo area */}
      <div className="flex flex-col items-center px-6 py-6">
        {/* ZESA crest */}
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-2 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
          <Image
            src="/zesa-logo.png"
            alt="ZESA Holdings"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white">
            ZESA Holdings
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-500">
            ZETDC Attendance System
          </p>
        </div>
        {/* Divider */}
        <div className="mt-5 h-px w-full bg-brand-800" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pb-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-500">
          Navigation
        </p>
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-700 text-white shadow-brand-sm"
                  : "text-brand-300 hover:bg-brand-900 hover:text-white"
              )}
            >
              <span
                className={clsx(
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-gold-500/20 text-gold-400"
                    : "text-brand-400 group-hover:text-brand-200"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info panel */}
      <div className="border-t border-brand-800 px-4 py-4">
        <div className="rounded-lg bg-brand-900/60 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500">
            Demo credentials
          </p>
          <p className="mt-1.5 text-xs font-semibold text-brand-200">admin@example.com</p>
          <p className="text-xs text-brand-400">Admin@12345</p>
        </div>
        <p className="mt-3 text-center text-[10px] text-brand-600">
          © {new Date().getFullYear()} ZESA Holdings · All rights reserved
        </p>
      </div>
    </aside>
  );
}
