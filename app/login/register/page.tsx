"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//") ? rawCallbackUrl : null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = { email: form.get("email"), password: form.get("password"), name: form.get("name") };
    try {
      const res = await fetch("/api/auth/register", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
      if (res.ok) {
        const dest = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";
        router.push(dest);
      } else {
        const json = await res.json();
        setError(json?.error || "Failed to create account");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="flex justify-center mb-4">
        <Image src="/logo/icon.png" alt="Noted" width={140} height={140} priority />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input name="name" placeholder="Your name (optional)" className="input-field" />
        <input required name="email" type="email" placeholder="you@example.com" className="input-field" />
        <input required name="password" type="password" placeholder="Password (min 8 chars)" className="input-field" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center justify-between">
          <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-sm">
            {loading ? "Creating…" : "Create account"}
          </button>
          <a
            href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}
            className="text-sm text-neutral-500 hover:underline"
          >
            Back to login
          </a>
        </div>
      </form>
    </main>
  );
}
