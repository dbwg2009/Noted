import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireCurrentUserId } from "@/lib/people-queries";
import { listGiftGroups } from "@/lib/gift-groups-queries";
import { poundsFromPence } from "@/lib/birthdays";
import { createGiftGroup } from "./actions";

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  ordered: "Ordered",
  received: "Received",
};

const STATUS_COLOURS: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ordered: "bg-brand-blue-100 text-brand-blue-800 dark:bg-brand-blue-900/40 dark:text-brand-blue-200",
  received: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

export default async function GiftGroupsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = await requireCurrentUserId();
  const groups = await listGiftGroups(userId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Group Gifts</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Coordinate split purchases across multiple contributors.
          </p>
        </div>
      </div>

      {/* Create group */}
      <details className="card mt-6">
        <summary className="cursor-pointer text-sm font-medium">+ Create new group gift</summary>
        <form action={createGiftGroup} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Gift title (e.g. Nintendo Switch for Tom)"
            className={`${inputCls} md:col-span-2`}
          />
          <input
            name="targetAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Target amount (GBP, optional)"
            className={inputCls}
          />
          <textarea
            name="notes"
            rows={2}
            placeholder="Notes (optional)"
            className={`${inputCls} md:col-span-2`}
          />
          <button type="submit" className="btn-primary w-fit px-4 py-2 text-sm">
            Create group
          </button>
        </form>
      </details>

      {/* List */}
      {groups.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
          No group gifts yet. Create one above, or use the &ldquo;Group gift&rdquo; button on a wishlist item.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {groups.map((g) => {
            const pct =
              g.targetAmount && g.targetAmount > 0
                ? Math.min(100, Math.round((g.totalRaised / g.targetAmount) * 100))
                : null;

            return (
              <Link
                key={g.id}
                href={`/gift-groups/${g.id}`}
                className="card block hover:border-brand-blue-300 dark:hover:border-brand-blue-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{g.title}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOURS[g.status] ?? ""}`}
                      >
                        {STATUS_LABELS[g.status] ?? g.status}
                      </span>
                    </div>
                    {g.personName && (
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        For {g.personName}
                        {g.wishlistItemDescription ? ` · ${g.wishlistItemDescription}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium text-neutral-700 dark:text-neutral-300">
                      {poundsFromPence(g.totalRaised) ?? "£0"} raised
                    </p>
                    {g.targetAmount ? (
                      <p className="text-xs text-neutral-500">of {poundsFromPence(g.targetAmount)}</p>
                    ) : null}
                    <p className="text-xs text-neutral-500">
                      {g.contributors.length} contributor{g.contributors.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {pct !== null && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-brand-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
