export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form method="post" action="/api/auth/reset-password" className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black">Reset password</h1>
        <input type="hidden" name="token" value={searchParams.token ?? ""} />
        <label className="mt-6 block text-sm font-semibold">New password</label>
        <input name="password" type="password" required minLength={8} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" />
        <button className="mt-6 w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-bold text-white">Reset password</button>
      </form>
    </main>
  );
}
