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
        </nav>

        <div className="flex items-center gap-2 text-xs text-brand-blue-100">
          <span className="hidden md:inline">{session.user.email}</span>
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
