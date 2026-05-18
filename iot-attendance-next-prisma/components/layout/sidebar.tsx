"use client";

import { clsx } from "clsx";
import { Activity, BarChart3, BellRing, CalendarDays, LayoutDashboard, Settings2, Users, View } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "VIEWER" },
  { href: "/employees", label: "Employees", icon: Users, minRole: "VIEWER" },
  { href: "/attendance", label: "Attendance", icon: Activity, minRole: "VIEWER" },
  { href: "/timesheets", label: "Timesheets", icon: CalendarDays, minRole: "VIEWER" },
  { href: "/reports", label: "Reports", icon: BarChart3, minRole: "VIEWER" },
  { href: "/operations", label: "Operations", icon: BellRing, minRole: "MANAGER" },
  { href: "/portal", label: "Portal", icon: View, minRole: "VIEWER" },
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
  const visibleLinks = links.filter((link) => roleRank[(role as keyof typeof roleRank) ?? "VIEWER"] >= roleRank[link.minRole as keyof typeof roleRank]);

  return (
    <aside className="sticky top-0 hidden h-screen w-72 overflow-y-auto border-r border-white/60 bg-white/75 px-6 py-8 backdrop-blur lg:block">
      <div className="rounded-[2rem] bg-[linear-gradient(145deg,#020617,#0f172a_55%,#1d4ed8_150%)] p-5 text-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.9)]">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-200">RFID IoT</p>
        <h1 className="mt-2 text-2xl font-black">Attendance Hub</h1>
        <p className="mt-2 text-sm text-slate-300">Live operations, workforce visibility, and payroll-ready timesheets.</p>
      </div>

      <nav className="mt-8 space-y-2">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                active
                  ? "bg-gradient-to-r from-brand-50 to-sky-50 text-brand-700 shadow-[0_12px_30px_-24px_rgba(29,78,216,0.85)]"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 rounded-[1.6rem] border border-slate-200 bg-white/85 p-4 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Demo login</p>
        <p className="mt-2 text-sm font-semibold text-slate-900">admin@example.com</p>
        <p className="text-sm text-slate-600">Admin@12345</p>
      </div>
    </aside>
  );
}
