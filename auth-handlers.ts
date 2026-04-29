import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Birthday Gift Finder</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Track friends&rsquo; and family birthdays, capture gift ideas, and let AI find real
        products with prices and links.
      </p>

      {session?.user ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Signed in as <span className="font-medium">{session.user.email}</span>.
          </p>
          <div className="flex gap-3">
            <Link
              href="/people"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
            >
              Open people list
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          className="inline-block w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        >
          Sign in
        </Link>
      )}
    </main>
  );
}
