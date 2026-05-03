import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center">
          {/* Icon only on small screens */}
          <Image
            src="/logo/icon.png"
            alt="Noted"
            width={40}
            height={40}
            className="sm:hidden"
            priority
          />
          {/* Text logo on sm+ */}
          <Image
            src="/logo/text.png"
            alt="Noted"
            width={200}
            height={56}
            className="hidden sm:block h-11 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/calendar">Calendar</NavLink>
          <NavLink href="/people">People</NavLink>
        </nav>

        <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="hidden md:inline">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}
