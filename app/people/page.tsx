import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listPeopleSummary, requireCurrentUserId } from "@/lib/people-queries";
import { Avatar, CountdownBadge, TagChip } from "@/components/badges";
import { formatBirthday } from "@/lib/birthdays";

type SearchParams = { sort?: "soonest" | "name" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = await requireCurrentUserId();
  const params = await searchParams;
  const sort = params.sort === "name" ? "name" : "soonest";

  const people = await listPeopleSummary(userId);
  const sorted = [...people].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : a.daysUntilBirthday - b.daysUntilBirthday,
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">People</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {people.length} tracked. Click a card to view their wishlist and gift ideas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-neutral-300 p-0.5 text-xs dark:border-neutral-700">
            <SortLink active={sort === "soonest"} sort="soonest">Soonest</SortLink>
            <SortLink active={sort === "name"} sort="name">A–Z</SortLink>
          </div>
          <Link
            href="/people/new"
            className="btn-primary px-4 py-2 text-sm"
          >
            + Add person
          </Link>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No people yet.
          </p>
          <Link
            href="/people/new"
            className="mt-3 inline-block btn-primary px-4 py-2 text-sm"
          >
            Add your first person
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((p) => (
            <li key={p.id}>
              <Link
                href={`/people/${p.id}`}
                className="card block transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={p.name} photoUrl={p.photoUrl} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{p.name}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {p.relationship ?? "—"}
                    </p>
                  </div>
                  <CountdownBadge days={p.daysUntilBirthday} />
                </div>
                <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
                  {formatBirthday(p.birthday, p.birthYearKnown)}
                  {p.nextAge !== null && (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {" "}· turns {p.nextAge}
                    </span>
                  )}
                </p>
                {p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <TagChip key={t}>{t}</TagChip>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function SortLink({
  active,
  sort,
  children,
}: {
  active: boolean;
  sort: "soonest" | "name";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/people?sort=${sort}`}
      className={
        active
          ? "rounded bg-brand-blue-500 px-2 py-1 font-medium text-white"
          : "rounded px-2 py-1 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      }
    >
      {children}
    </Link>
  );
}
