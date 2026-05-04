import Image from "next/image";
import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="flex justify-center mb-4">
        <Image src="/logo/icon.png" alt="Noted" width={140} height={140} priority />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Noted</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Sign in with email and password.</p>
          <form
            action={async (formData) => {
              "use server";
              await signIn("credentials", {
                email: String(formData.get("email")),
                password: String(formData.get("password")),
                redirectTo: "/",
              });
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <input
              type="password"
              name="password"
              required
              placeholder="Password"
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <div className="flex items-center justify-between">
              <button type="submit" className="btn-primary px-4 py-2 text-sm">
                Sign in
              </button>
              <div className="flex flex-col items-end gap-1">
                <a href="/login/register" className="text-sm text-neutral-500 hover:underline">
                  Create account
                </a>
                <a href="/login/forgot" className="text-sm text-neutral-500 hover:underline">
                  Forgot password?
                </a>
              </div>
            </div>
          </form>
    </main>
  );
}
