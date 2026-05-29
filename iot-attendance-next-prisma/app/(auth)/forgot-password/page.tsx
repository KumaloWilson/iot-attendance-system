import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <Image src="/zesa-logo.png" alt="ZESA Holdings" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-600">ZESA Holdings</p>
            <p className="text-sm font-bold text-brand-900">ZETDC Attendance System</p>
          </div>
        </div>

        <form method="post" action="/api/auth/forgot-password" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-brand-950">Forgot password</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Enter your ZETDC staff email address. A reset link will be sent if the account exists.
          </p>

          <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Email address
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="you@zetdc.co.zw"
          />

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-brand-sm transition hover:-translate-y-0.5 hover:bg-brand-600 active:translate-y-0"
          >
            Request reset link
          </button>

          <Link
            href="/login"
            className="mt-4 block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Back to sign in
          </Link>
        </form>
      </div>
    </main>
  );
}
