export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form method="post" action="/api/auth/forgot-password" className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your email. In development, the reset link is returned in the response/logs.</p>
        <label className="mt-6 block text-sm font-semibold">Email</label>
        <input name="email" type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
        <button className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white">Request reset link</button>
      </form>
    </main>
  );
}
