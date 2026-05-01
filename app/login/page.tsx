import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12 text-center">
      <div className="flex justify-center mb-4">
        <img src="/logo/full.png" alt="Noted" className="h-16 w-auto" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Noted</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Enter your email. We&rsquo;ll send you a magic link.
      </p>
      <form
        action={async (formData) => {
          "use server";
          await signIn("resend", {
            email: formData.get("email"),
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
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        >
          Send magic link
        </button>
      </form>
    </main>
  );
}
