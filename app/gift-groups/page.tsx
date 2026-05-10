import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireCurrentUserId } from "@/lib/people-queries";
import { listGiftGroups } from "@/lib/gift-groups-queries";
import { poundsFromPence } from "@/lib/birthdays";
import { createGiftGroup, acceptLinkedInvite, declineInvitation } from "./actions";
import { ActionForm } from "./action-form";
import { inputCls, STATUS_LABELS, STATUS_COLOURS } from "./constants";

function GroupCard({ g }: { g: { id: string; title: string; status: string; targetAmount: number | null; personName: string | null; wishlistItemDescription: string | null; contributors: unknown[]; totalRaised: number } }) {
  const pct =
    g.targetAmount && g.targetAmount > 0
      ? Math.min(100, Math.round((g.totalRaised / g.targetAmount) * 100))
      : null;

  return (
    <Link
      href={`/gift-groups/${g.id}`}
      className="card block hover:border-brand-blue-300 dark:hover:border-brand-blue-700 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{g.title}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLOURS[g.status]}`}
            >
              {STATUS_LABELS[g.status]}
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
          <div className="h-full rounded-full bg-brand-blue-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </Link>
  );
}

export default async function GiftGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = await requireCurrentUserId();
  const { owned, contributing, pendingInvitations } = await listGiftGroups(userId);
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {error === "invite_expired" && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          This invitation has expired. Ask the group organiser to resend it.
        </div>
      )}
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
        <ActionForm action={createGiftGroup} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Gift title (e.g. Nintendo Switch for Tom)"
            aria-label="Gift title"
            className={`${inputCls} md:col-span-2`}
          />
          <input
            name="targetAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Target amount (GBP, optional)"
            aria-label="Target amount in GBP (optional)"
            className={inputCls}
          />
          <textarea
            name="notes"
            rows={2}
            placeholder="Notes (optional)"
            aria-label="Notes (optional)"
            className={`${inputCls} md:col-span-2`}
          />
          <button type="submit" className="btn-primary w-fit px-4 py-2 text-sm">
            Create group
          </button>
        </ActionForm>
      </details>

      {/* Groups I manage */}
      <section className="mt-8">
        <h2 className="text-base font-semibold">Groups I manage</h2>
        {owned.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            No group gifts yet. Create one above, or use the &ldquo;Group gift&rdquo; button on a wishlist item.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {owned.map((g) => <GroupCard key={g.id} g={g} />)}
          </div>
        )}
      </section>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Pending invitations</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            You&rsquo;ve been invited to contribute to these group gifts.
          </p>
          <ul className="mt-3 space-y-3">
            {pendingInvitations.map((g) => (
              <li key={g.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">{g.title}</p>
                  {g.personName && (
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      For {g.personName}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <ActionForm action={acceptLinkedInvite}>
                    <input type="hidden" name="contributorId" value={g.contributorId} />
                    <input type="hidden" name="groupId" value={g.id} />
                    <button type="submit" className="btn-primary px-4 py-1.5 text-sm">
                      Accept
                    </button>
                  </ActionForm>
                  <ActionForm action={declineInvitation}>
                    <input type="hidden" name="contributorId" value={g.contributorId} />
                    <input type="hidden" name="groupId" value={g.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    >
                      Decline
                    </button>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Groups I'm contributing to */}
      {contributing.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold">Groups I&rsquo;m contributing to</h2>
          <div className="mt-3 space-y-3">
            {contributing.map((g) => <GroupCard key={g.id} g={g} />)}
          </div>
        </section>
      )}
    </main>
  );
}
