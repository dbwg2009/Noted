"use client";
import { useState } from "react";
import Image from "next/image";

export default function ForgotPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    try {
      const res = await fetch("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }), headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        setStatus("If an account exists, a reset link was sent to that email.");
      } else {
        const j = await res.json();
        setError(j?.error || "Failed to request reset");
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
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-sm text-neutral-600">Enter the email for your account and we'll email a reset link.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="email" type="email" required placeholder="you@example.com" className="input-field" />
        {status && <div className="text-sm text-green-600">{status}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center justify-between">
          <button type="submit" className="btn-primary px-4 py-2 text-sm">Send reset link</button>
          <a href="/login" className="text-sm text-neutral-500 hover:underline">Back to login</a>
        </div>
      </form>
    </main>
  );
}
