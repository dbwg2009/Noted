"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

export default function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) setError("Missing token or email in link.");
  }, [token, email]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");
    if (password !== passwordConfirm) return setError("Passwords do not match");
    try {
      const res = await fetch("/api/auth/reset", { method: "POST", body: JSON.stringify({ token, email, password }), headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        setStatus("Password updated. You can now sign in.");
      } else {
        const j = await res.json();
        setError(j?.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="flex justify-center mb-4">
        <Image src="/logo/icon.png" alt="Noted" width={140} height={140} priority />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="text-sm text-neutral-600">Choose a new password for <strong>{email}</strong>.</p>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {status && <div className="text-sm text-green-600">{status}</div>}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="password" type="password" required placeholder="New password (min 8 chars)" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" />
        <input name="passwordConfirm" type="password" required placeholder="Confirm password" className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm" />
        <div className="flex items-center justify-between">
          <button type="submit" className="btn-primary px-4 py-2 text-sm">Set password</button>
          <a href="/login" className="text-sm text-neutral-500 hover:underline">Back to login</a>
        </div>
      </form>
    </main>
  );
}
