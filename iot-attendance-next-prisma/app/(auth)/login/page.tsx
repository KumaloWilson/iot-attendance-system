"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false
    });
    setLoading(false);
    if (result?.error) setError("Invalid email or password");
    else router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form action={onSubmit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Attendance Admin</p>
        <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Use your administrator account. Public registration is disabled.</p>
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="mt-6 block text-sm font-semibold">Email</label>
        <input name="email" type="email" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" defaultValue="admin@example.com" />
        <label className="mt-4 block text-sm font-semibold">Password</label>
        <input name="password" type="password" required className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" defaultValue="Admin@12345" />
        <Button disabled={loading} className="mt-6 w-full">{loading ? "Signing in..." : "Sign in"}</Button>
        <Link href="/forgot-password" className="mt-4 block text-center text-sm font-semibold">Forgot password?</Link>
      </form>
    </main>
  );
}
