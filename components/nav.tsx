import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="sticky top-0 z-30 bg-brand-blue-600 shadow-md dark:bg-brand-blue-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo/icon.png"
            alt="Noted"
            width={36}
            height={36}
            priority
          />
          <span className="hidden text-lg font-semibold tracking-tight text-white sm:block">
            Noted
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/">Dashboard</NavLink>
          <NavLink href="/calendar">Calendar</NavLink>
          <NavLink href="/people">People</NavLink>
          <NavLink href="/gift-groups">Groups</NavLink>
        </nav>

        <div className="flex items-center gap-2 text-xs text-brand-blue-100">
          <Link
            href="/settings"
            className="hidden rounded-md px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white md:block"
          >
            {session.user.name ?? session.user.email}
          </Link>
          <Link
            href="/settings"
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
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
      className="rounded-md px-3 py-1.5 font-medium text-white/80 hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
