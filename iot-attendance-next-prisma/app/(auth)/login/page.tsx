"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false
    });
    setLoading(false);
    if (result?.error) setError("Invalid email or password. Please check your credentials.");
    else router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen">
      {/* Left panel — ZETDC brand */}
      <div className="relative hidden w-[52%] flex-col overflow-hidden bg-brand-950 lg:flex">
        {/* Gold top accent */}
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600" />

        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.8) 40px, rgba(255,255,255,0.8) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.8) 40px, rgba(255,255,255,0.8) 41px)"
          }}
        />

        {/* Radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(0,48,135,0.6),transparent_65%)]" />

        <div className="relative z-10 flex flex-1 flex-col">
          {/* Logo */}
          <div className="px-10 pt-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)]">
                <Image src="/zesa-logo.png" alt="ZESA Holdings" width={44} height={44} className="object-contain" />
              </div>
              <div>
                <p className="text-base font-black uppercase tracking-[0.12em] text-white">
                  ZESA Holdings
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">
                  ZETDC Division
                </p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col justify-center px-10 pb-16">
            <div className="max-w-sm">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1">
                <div className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-400">
                  Staff Portal
                </span>
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-white">
                Attendance
                <br />
                <span className="text-gold-400">Management</span>
                <br />
                System
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-brand-300">
                RFID-powered workforce attendance tracking for Zimbabwe&apos;s national electricity
                transmission and distribution company.
              </p>

              {/* Feature list */}
              <div className="mt-8 space-y-3">
                {[
                  "Real-time RFID check-in/check-out",
                  "Automated timesheet generation",
                  "Multi-site device monitoring",
                  "HR approval workflow"
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/20">
                      <svg className="h-3 w-3 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-brand-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-brand-800 px-10 py-5">
            <p className="text-[11px] text-brand-600">
              © {new Date().getFullYear()} ZESA Holdings (Pvt) Ltd · Zimbabwe Electricity
              Transmission &amp; Distribution Company (ZETDC)
            </p>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <Image src="/zesa-logo.png" alt="ZESA" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-600">ZESA Holdings</p>
            <p className="text-sm font-bold text-brand-900">ZETDC Attendance System</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tight text-brand-950">Sign in</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Authorised personnel only. Use your ZETDC staff credentials.
            </p>
          </div>

          <form action={onSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue="admin@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder="you@zetdc.co.zw"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  defaultValue="Admin@12345"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-brand-md transition hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in to ZETDC Portal"
              )}
            </button>
          </form>

          {/* Demo note */}
          <div className="mt-6 rounded-xl border border-gold-200 bg-gold-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gold-700">
              Demo environment
            </p>
            <p className="mt-1 text-xs text-gold-800">
              Credentials are pre-filled for demonstration purposes.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-[11px] text-slate-400">
            Unauthorised access is prohibited and subject to disciplinary action.
          </p>
        </div>
      </div>
    </main>
  );
}
