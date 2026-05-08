import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireCurrentUserId } from "@/lib/people-queries";
import { getGiftGroup } from "@/lib/gift-groups-queries";
import { poundsFromPence } from "@/lib/birthdays";
import {
  updateGiftGroup,
  addContributor,
  updateContributor,
  deleteContributor,
} from "../actions";
import { DeleteGroupButton } from "./delete-group-button";

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  ordered: "Ordered",
  received: "Received",
};

const STATUS_COLOURS: Record<string, string> = {
  planning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  ordered:
    "bg-brand-blue-100 text-brand-blue-800 dark:bg-brand-blue-900/40 dark:text-brand-blue-200",
  received: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
};

function formatPenceInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}

export default async function GiftGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const userId = await requireCurrentUserId();
  const group = await getGiftGroup(id, userId);
  if (!group) notFound();

  const pct =
    group.targetAmount && group.targetAmount > 0
      ? Math.min(100, Math.round((group.totalRaised / group.targetAmount) * 100))
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/gift-groups"
        className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
      >
        ← Back to group gifts
      </Link>

      {/* Header */}
      <header className="card mt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{group.title}</h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOURS[group.status] ?? ""}`}
              >
                {STATUS_LABELS[group.status] ?? group.status}
              </span>
            </div>
            {group.personName && (
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                For{" "}
                {group.personId ? (
                  <Link
                    href={`/people/${group.personId}`}
                    className="font-medium hover:underline"
                  >
                    {group.personName}
                  </Link>
                ) : (
                  group.personName
                )}
                {group.wishlistItemDescription ? ` · ${group.wishlistItemDescription}` : ""}
              </p>
            )}
            {group.notes && (
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {group.notes}
              </p>
            )}
          </div>

          {/* Edit group */}
          <details className="shrink-0 text-xs">
            <summary className="cursor-pointer text-neutral-600 hover:underline dark:text-neutral-400">
              Edit
            </summary>
            <form action={updateGiftGroup} className="mt-3 grid gap-2 min-w-[220px]">
              <input type="hidden" name="groupId" value={group.id} />
              <input
                name="title"
                required
                defaultValue={group.title}
                className={inputCls}
              />
              <select name="status" defaultValue={group.status} className={inputCls}>
                <option value="planning">Planning</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
              </select>
              <input
                name="targetAmount"
                type="number"
                min="0"
                step="0.01"
                defaultValue={formatPenceInput(group.targetAmount)}
                placeholder="Target amount (GBP, optional)"
                className={inputCls}
              />
              <textarea
                name="notes"
                rows={2}
                defaultValue={group.notes ?? ""}
                placeholder="Notes"
                className={inputCls}
              />
              <button type="submit" className="btn-primary px-3 py-1.5 text-sm w-fit">
                Save
              </button>
            </form>

            <DeleteGroupButton groupId={group.id} />
          </details>
        </div>

        {/* Totals */}
        <div className="mt-4 flex flex-wrap items-baseline gap-4">
          <div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Total raised</p>
            <p className="text-lg font-semibold">{poundsFromPence(group.totalRaised) ?? "£0"}</p>
          </div>
          {group.targetAmount !== null && (
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Target</p>
              <p className="text-lg font-semibold">{poundsFromPence(group.targetAmount)}</p>
            </div>
          )}
          {group.targetAmount !== null && pct !== null && (
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{pct}% funded</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-brand-blue-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Contributors */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Contributors</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {group.contributors.length}{" "}
            {group.contributors.length === 1 ? "person" : "people"}
          </span>
        </div>

        {/* Add contributor */}
        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">+ Add contributor</summary>
          <form action={addContributor} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="groupId" value={group.id} />
            <input name="name" required placeholder="Name" className={inputCls} />
            <input name="email" type="email" placeholder="Email (optional)" className={inputCls} />
            <input
              name="contributionAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount (GBP, optional)"
              className={inputCls}
            />
            <button type="submit" className="btn-primary w-fit px-4 py-2 text-sm">
              Add
            </button>
          </form>
        </details>

        {group.contributors.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            No contributors yet. Add the people chipping in above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {group.contributors.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{c.name}</p>
                      {c.paid && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800 dark:bg-green-950 dark:text-green-200">
                          Paid
                        </span>
                      )}
                    </div>
                    {c.email && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.email}</p>
                    )}
                    <p className="mt-0.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {c.contributionAmount !== null
                        ? poundsFromPence(c.contributionAmount)
                        : "Amount TBD"}
                    </p>
                  </div>

                  {/* Edit contributor */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-neutral-600 hover:underline dark:text-neutral-400">
                      Edit
                    </summary>
                    <form action={updateContributor} className="mt-3 grid gap-2">
                      <input type="hidden" name="contributorId" value={c.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <input
                        name="name"
                        required
                        defaultValue={c.name}
                        className={inputCls}
                      />
                      <input
                        name="email"
                        type="email"
                        defaultValue={c.email ?? ""}
                        placeholder="Email"
                        className={inputCls}
                      />
                      <input
                        name="contributionAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={formatPenceInput(c.contributionAmount)}
                        placeholder="Amount (GBP)"
                        className={inputCls}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="paid"
                          defaultChecked={c.paid}
                          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                        />
                        Mark as paid
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                          Save
                        </button>
                      </div>
                    </form>
                    <form action={deleteContributor} className="mt-2">
                      <input type="hidden" name="contributorId" value={c.id} />
                      <input type="hidden" name="groupId" value={group.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Remove
                      </button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
