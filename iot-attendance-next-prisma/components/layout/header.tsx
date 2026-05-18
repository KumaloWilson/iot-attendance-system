"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

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
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-700">Attendance Hub</p>
          <p className="mt-1 text-sm text-slate-600">
            {name ?? "User"} · {role ?? "VIEWER"}
          </p>
          <p className="text-xs text-slate-500">{email ?? ""}</p>
          <p className="mt-1 text-xs text-slate-400">
            Updated {updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "just now"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-amber-800">
            {notificationCount} open alerts
          </div>
          <Button
            type="button"
            className="gap-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
