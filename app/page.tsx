import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listPeopleSummary, requireCurrentUserId } from "@/lib/people-queries";
import { Avatar, CountdownBadge, TagChip } from "@/components/badges";
import { formatBirthday } from "@/lib/birthdays";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = await requireCurrentUserId();
  const people = await listPeopleSummary(userId);
  const upcoming = [...people].sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday).slice(0, 6);
  const thisMonth = people.filter((p) => p.daysUntilBirthday <= 31);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi, {session.user.email?.split("@")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {people.length === 0
              ? "No people yet. Start by adding someone you love."
              : `${people.length} ${people.length === 1 ? "person" : "people"} tracked · ${thisMonth.length} birthday${thisMonth.length === 1 ? "" : "s"} in the next month.`}
          </p>
        </div>
        <Link
          href="/people/new"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
        >
          + Add person
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="People" value={people.length} />
        <Stat label="This month" value={thisMonth.length} />
        <Stat label="Next birthday" value={upcoming[0] ? upcoming[0].name : "—"} subdued />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Upcoming birthdays</h2>
          <Link href="/calendar" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            See calendar →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            Add your first person to see upcoming birthdays here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/people/${p.id}`}
                  className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Avatar name={p.name} photoUrl={p.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <CountdownBadge days={p.daysUntilBirthday} />
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                      {formatBirthday(p.birthday, p.birthYearKnown)}
                      {p.nextAge !== null && ` · turning ${p.nextAge}`}
                    </p>
                    {p.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.tags.slice(0, 4).map((t) => (
                          <TagChip key={t}>{t}</TagChip>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, subdued = false }: { label: string; value: string | number; subdued?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${subdued ? "text-neutral-700 dark:text-neutral-300" : ""}`}>
        {value}
      </p>
    </div>
  );
}
