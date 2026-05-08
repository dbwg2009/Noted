import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getPersonDetail, requireCurrentUserId } from "@/lib/people-queries";
import { getWishlistShareForPerson } from "@/lib/share-queries";
import { Avatar, CountdownBadge, StatusPill, TagChip } from "@/components/badges";
import { formatBirthday, poundsFromPence } from "@/lib/birthdays";
import { getOccasionsForPerson, getSiteWideOccasionsForPerson } from "@/lib/occasions-queries";
import { formatOccasionDate, getKnownOccasionLabel } from "@/lib/occasions";
import { createOccasion, updateOccasion, deleteOccasion } from "../occasion-actions";
import { excludePersonFromOccasion, includePersonInOccasion } from "@/app/settings/occasion-actions";
import { upsertWishlistShare, regenerateWishlistShare, revokeWishlistShare } from "../share-actions";
import { CopyButton } from "@/components/copy-button";
import { AddOccasionForm } from "./add-occasion-form";
import {
  addGiftHistoryEntry,
  addManualProduct,
  backfillDefaultReminders,
  createWishlistItem,
  deleteGiftHistoryEntry,
  deletePerson,
  deleteProduct,
  deleteWishlistItem,
  dismissSuggestion,
  findProductsForWishlistItem,
  markWishlistItemGiven,
  promoteSuggestionToWishlist,
  sendTestReminder,
  suggestGifts,
  updatePerson,
  updateWishlistItem,
} from "../actions";
import { createGiftGroup } from "@/app/gift-groups/actions";
import { AiSubmitButton } from "./ai-submit-button";

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

function formatPenceInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}

function getSizeValue(sizes: Record<string, string> | null, key: string) {
  if (!sizes || typeof sizes !== "object") return "";
  const v = sizes[key];
  return typeof v === "string" ? v : "";
}

function getBirthdayParts(birthday: string) {
  const [year, month, day] = birthday.split("-");
  return {
    month: month?.padStart(2, "0") ?? "01",
    day: day?.padStart(2, "0") ?? "01",
  };
}

export default async function PersonDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const userId = await requireCurrentUserId();
  const person = await getPersonDetail(id, userId);
  if (!person) notFound();

  const [occasions, siteWideOccasions, wishlistShare] = await Promise.all([
    getOccasionsForPerson(id),
    getSiteWideOccasionsForPerson(userId, id),
    getWishlistShareForPerson(id),
  ]);

  const baseUrl = (process.env.AUTH_URL ?? "").replace(/\/$/, "");
  const shareUrl = wishlistShare ? `${baseUrl}/share/${wishlistShare.token}` : "";

  const flashRaw = (await cookies()).get("people_flash")?.value;
  let flash: { message: string; tone: "success" | "warning" | "error" } | null = null;
  if (flashRaw) {
    try {
      flash = JSON.parse(flashRaw) as { message: string; tone: "success" | "warning" | "error" };
    } catch {
      flash = null;
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/people" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
        ← Back to people
      </Link>

      {/* Header */}
      <header className="card mt-4 flex flex-wrap items-center gap-5">
        <Avatar name={person.name} photoUrl={person.photoUrl} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
            <CountdownBadge days={person.daysUntilBirthday} />
          </div>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {formatBirthday(person.birthday, person.birthYearKnown)}
            {person.nextAge !== null && ` · turning ${person.nextAge}`}
            {person.relationship && ` · ${person.relationship}`}
          </p>
          {(person.budgetMin !== null || person.budgetMax !== null) && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Budget:{" "}
              {person.budgetMin !== null ? poundsFromPence(person.budgetMin) : "—"}
              {" – "}
              {person.budgetMax !== null ? poundsFromPence(person.budgetMax) : "—"}
            </p>
          )}
          {person.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {person.tags.map((t) => (
                <TagChip key={t}>{t}</TagChip>
              ))}
            </div>
          )}
        </div>
      </header>

      {flash && (
        <p
          className={`mt-4 rounded-md border px-3 py-2 text-sm ${
            flash.tone === "success"
              ? "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
              : flash.tone === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {flash.message}
        </p>
      )}

      {/* Notes / avoid */}
      {(person.notes || person.avoid) && (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {person.notes && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Notes
              </h2>
              <p className="mt-2 text-sm whitespace-pre-wrap">{person.notes}</p>
            </div>
          )}
          {person.avoid && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Avoid
              </h2>
              <p className="mt-2 text-sm whitespace-pre-wrap">{person.avoid}</p>
            </div>
          )}
        </section>
      )}

      {/* Wishlist */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Wishlist</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {person.wishlist.length} {person.wishlist.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Add item */}
        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">+ Add wishlist item</summary>
          <form action={createWishlistItem} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="personId" value={person.id} />
            <input
              name="description"
              required
              placeholder="What they want"
              className={`${inputCls} md:col-span-2`}
            />
            <input
              name="sourceNote"
              placeholder="Source note (where/when you heard it)"
              className={`${inputCls} md:col-span-2`}
            />
            <input name="heardOn" type="date" className={inputCls} />
            <select name="status" defaultValue="idea" className={inputCls}>
              <option value="idea">idea</option>
              <option value="researching">researching</option>
              <option value="chosen">chosen</option>
              <option value="purchased">purchased</option>
              <option value="given">given</option>
            </select>
            <input name="priceMin" type="number" min="0" step="0.01" placeholder="Price min (GBP)" className={inputCls} />
            <input name="priceMax" type="number" min="0" step="0.01" placeholder="Price max (GBP)" className={inputCls} />
            <button
              type="submit"
              className="btn-primary w-fit px-4 py-2 text-sm md:col-span-2"
            >
              Add item
            </button>
          </form>
        </details>

        {person.wishlist.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            No wishlist items yet. Add the things they&rsquo;ve mentioned wanting.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {person.wishlist.map((item) => (
              <article key={item.id} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">{item.description}</h3>
                    <StatusPill status={item.status} />
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-neutral-600 hover:underline dark:text-neutral-400">
                      Edit
                    </summary>
                    <form action={updateWishlistItem} className="mt-3 grid gap-2 md:grid-cols-2">
                      <input type="hidden" name="wishlistItemId" value={item.id} />
                      <input
                        name="description"
                        required
                        defaultValue={item.description}
                        className={`${inputCls} md:col-span-2`}
                      />
                      <input
                        name="sourceNote"
                        defaultValue={item.sourceNote ?? ""}
                        placeholder="Source note"
                        className={`${inputCls} md:col-span-2`}
                      />
                      <input name="heardOn" type="date" defaultValue={item.heardOn ?? ""} className={inputCls} />
                      <select name="status" defaultValue={item.status} className={inputCls}>
                        <option value="idea">idea</option>
                        <option value="researching">researching</option>
                        <option value="chosen">chosen</option>
                        <option value="purchased">purchased</option>
                        <option value="given">given</option>
                      </select>
                      <input
                        name="priceMin"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={formatPenceInput(item.priceMin)}
                        placeholder="Price min (GBP)"
                        className={inputCls}
                      />
                      <input
                        name="priceMax"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={formatPenceInput(item.priceMax)}
                        placeholder="Price max (GBP)"
                        className={inputCls}
                      />
                      <div className="flex items-center gap-2 md:col-span-2">
                        <button
                          type="submit"
                          className="btn-primary px-3 py-1.5 text-sm"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                    <form action={deleteWishlistItem} className="mt-2">
                      <input type="hidden" name="wishlistItemId" value={item.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Delete item
                      </button>
                    </form>
                  </details>
                </div>

                {item.sourceNote && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {item.sourceNote}
                    {item.heardOn && ` · ${item.heardOn}`}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={findProductsForWishlistItem}>
                    <input type="hidden" name="wishlistItemId" value={item.id} />
                    <AiSubmitButton
                      idleLabel="🔎 Find products (AI)"
                      pendingLabel="Searching… (up to ~60s)"
                      className="btn-primary px-3 py-1.5 text-sm"
                    />
                  </form>
                  <details className="text-xs">
                    <summary className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
                      + Add manually
                    </summary>
                    <form action={addManualProduct} className="mt-3 grid gap-2 md:grid-cols-4">
                      <input type="hidden" name="wishlistItemId" value={item.id} />
                      <input name="title" required placeholder="Title" className={`${inputCls} md:col-span-2`} />
                      <input name="url" type="url" required placeholder="https://..." className={`${inputCls} md:col-span-2`} />
                      <input name="retailer" placeholder="Retailer" className={inputCls} />
                      <input name="price" type="number" step="0.01" min="0" placeholder="Price GBP" className={inputCls} />
                      <button
                        type="submit"
                        className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900 md:col-span-2"
                      >
                        Save manual product
                      </button>
                    </form>
                  </details>
                  {item.status !== "given" && (
                    <details className="text-xs">
                      <summary className="cursor-pointer rounded-md border border-green-300 px-3 py-1.5 font-medium text-green-800 hover:bg-green-50 dark:border-green-900 dark:text-green-200 dark:hover:bg-green-950">
                        🎁 Mark as given
                      </summary>
                      <form action={markWishlistItemGiven} className="mt-3 grid gap-2 md:grid-cols-3">
                        <input type="hidden" name="wishlistItemId" value={item.id} />
                        <input name="givenOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
                        <input name="pricePaid" type="number" step="0.01" min="0" placeholder="Price paid (GBP)" className={inputCls} />
                        <input name="reactionNotes" placeholder="Their reaction" className={inputCls} />
                        <button
                          type="submit"
                          className="w-fit rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500 md:col-span-3"
                        >
                          Record gift
                        </button>
                      </form>
                    </details>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
                      👥 Group gift
                    </summary>
                    <form action={createGiftGroup} className="mt-3 grid gap-2 md:grid-cols-2">
                      <input type="hidden" name="personId" value={person.id} />
                      <input type="hidden" name="wishlistItemId" value={item.id} />
                      <input
                        name="title"
                        required
                        defaultValue={item.description}
                        placeholder="Group gift title"
                        className={`${inputCls} md:col-span-2`}
                      />
                      <input
                        name="targetAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={item.priceMax !== null ? (item.priceMax / 100).toFixed(2) : ""}
                        placeholder="Target amount (GBP, optional)"
                        className={inputCls}
                      />
                      <textarea
                        name="notes"
                        rows={2}
                        placeholder="Notes (optional)"
                        className={`${inputCls} md:col-span-2`}
                      />
                      <button
                        type="submit"
                        className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                      >
                        Create group
                      </button>
                    </form>
                  </details>
                </div>

                {item.products.length > 0 && (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {item.products.map((product) => (
                      <li
                        key={product.id}
                        className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={product.url}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-2 text-sm font-medium text-brand-blue-600 hover:underline dark:text-brand-blue-300"
                          >
                            {product.title}
                          </a>
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                            {product.source === "ai_search" ? "AI" : "Manual"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {[product.retailer, poundsFromPence(product.price)].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <form action={deleteProduct} className="mt-2">
                          <input type="hidden" name="productId" value={product.id} />
                          <button
                            type="submit"
                            className="text-[11px] text-red-600 hover:underline dark:text-red-400"
                          >
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Occasions */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Occasions</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {occasions.length + siteWideOccasions.length} {occasions.length + siteWideOccasions.length === 1 ? "occasion" : "occasions"}
          </span>
        </div>

        {/* Site-wide occasions */}
        {siteWideOccasions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">Site-wide</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {siteWideOccasions.map((o) => (
                <li key={o.id} className={`card flex items-start justify-between gap-3 ${o.excluded ? "opacity-50" : ""}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{o.name ?? getKnownOccasionLabel(o.kind)}</p>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">Site-wide</span>
                      {o.excluded && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">Excluded</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{formatOccasionDate(o.date, false, o.kind)}</p>
                  </div>
                  <form action={o.excluded ? includePersonInOccasion : excludePersonFromOccasion} className="shrink-0">
                    <input type="hidden" name="occasionId" value={o.id} />
                    <input type="hidden" name="personId" value={person.id} />
                    <input type="hidden" name="_referrer" value={`/people/${person.id}`} />
                    <button
                      type="submit"
                      className={`rounded px-2 py-1 text-[11px] font-medium border ${
                        o.excluded
                          ? "border-brand-blue-300 text-brand-blue-600 hover:bg-brand-blue-50 dark:border-brand-blue-700 dark:text-brand-blue-400"
                          : "border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400"
                      }`}
                    >
                      {o.excluded ? "Include" : "Exclude"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-neutral-400">
              Manage site-wide occasions in <a href="/settings" className="underline hover:text-neutral-600">Settings</a>.
            </p>
          </div>
        )}

        <AddOccasionForm personId={person.id} createAction={createOccasion} />

        {occasions.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No personal occasions yet for this person.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {occasions.map((o) => (
              <li key={o.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{o.name ?? o.kind}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{formatOccasionDate(o.date, false, o.kind)}</p>
                  </div>
                  <details>
                              <summary className="cursor-pointer text-xs text-neutral-600 hover:underline dark:text-neutral-400">Edit</summary>
                              <form id={`update-occ-${o.id}`} action={updateOccasion} className="mt-2 grid gap-2">
                      <input type="hidden" name="occasionId" value={o.id} />
                      <input type="hidden" name="kind" value={o.kind} />
                      <input name="name" defaultValue={o.name ?? ""} className={inputCls} />
                      {o.kind === "custom" || o.kind === "anniversary" ? (
                        <>
                          <input
                            id={`edit-occasion-date-${o.id}`}
                            name="date"
                            type="hidden"
                            defaultValue={o.date ?? ""}
                          />
                          <div id={`edit-occasion-date-fields-${o.id}`} className="grid gap-2 sm:grid-cols-2">
                            <select
                              id={`edit-occasion-month-${o.id}`}
                              name="occasionMonth"
                              defaultValue={o.date?.slice(5, 7) ?? "01"}
                              className={inputCls}
                            >
                              {[...Array(12)].map((_, index) => {
                                const month = index + 1;
                                return (
                                  <option key={month} value={month.toString().padStart(2, "0")}>{month}</option>
                                );
                              })}
                            </select>
                            <select
                              id={`edit-occasion-day-${o.id}`}
                              name="occasionDay"
                              defaultValue={o.date?.slice(8, 10) ?? "01"}
                              className={inputCls}
                            >
                              {[...Array(31)].map((_, index) => {
                                const day = index + 1;
                                return (
                                  <option key={day} value={day.toString().padStart(2, "0")}>{day}</option>
                                );
                              })}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                          {formatOccasionDate(o.date, false, o.kind)}
                        </div>
                      )}
                      <textarea name="notes" rows={2} defaultValue={o.notes ?? ""} className={inputCls} />
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Save</button>
                      </div>
                    </form>
                    <form action={deleteOccasion} className="mt-2">
                      <input type="hidden" name="occasionId" value={o.id} />
                      <button type="submit" className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">Delete</button>
                    </form>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Suggestions */}
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Gift suggestions</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              AI-generated ideas based on this person&rsquo;s wishlist, tags, history, and budget.
            </p>
          </div>
          <form action={suggestGifts}>
            <input type="hidden" name="personId" value={person.id} />
            <AiSubmitButton
              idleLabel="✨ Suggest gifts"
              pendingLabel="Thinking… (up to ~60s)"
              className="btn-primary px-3 py-1.5 text-sm"
            />
          </form>
        </div>

        {person.suggestions.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            No suggestions yet. Click <span className="font-medium">Suggest gifts</span> to generate some.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {person.suggestions.map((s) => (
              <li key={s.id} className="card">
                <h3 className="text-base font-semibold">{s.title}</h3>
                {s.rationale && (
                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{s.rationale}</p>
                )}
                {(s.estimatedPriceMin !== null || s.estimatedPriceMax !== null) && (
                  <p className="mt-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Est. {poundsFromPence(s.estimatedPriceMin) ?? "—"}
                    {" – "}
                    {poundsFromPence(s.estimatedPriceMax) ?? "—"}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={promoteSuggestionToWishlist}>
                    <input type="hidden" name="suggestionId" value={s.id} />
                    <button
                      type="submit"
                      className="btn-primary px-3 py-1 text-xs"
                    >
                      → Add to wishlist
                    </button>
                  </form>
                  <form action={dismissSuggestion}>
                    <input type="hidden" name="suggestionId" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gift history */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Gift history</h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {person.history.length} {person.history.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">+ Record a past gift</summary>
          <form action={addGiftHistoryEntry} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="personId" value={person.id} />
            <input name="title" required placeholder="What you gave" className={`${inputCls} md:col-span-2`} />
            <input name="givenOn" type="date" required className={inputCls} />
            <input name="pricePaid" type="number" step="0.01" min="0" placeholder="Price paid (GBP)" className={inputCls} />
            <textarea
              name="reactionNotes"
              rows={2}
              placeholder="Their reaction (loved it, polite smile, etc.)"
              className={`${inputCls} md:col-span-2`}
            />
            <button
              type="submit"
              className="btn-primary w-fit px-4 py-2 text-sm md:col-span-2"
            >
              Add entry
            </button>
          </form>
        </details>

        {person.history.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            No gifts recorded yet. Use &ldquo;Mark as given&rdquo; on a wishlist item or add an entry above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {person.history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{entry.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {entry.givenOn}
                      {entry.pricePaid !== null && ` · ${poundsFromPence(entry.pricePaid)}`}
                    </p>
                  </div>
                  <form action={deleteGiftHistoryEntry}>
                    <input type="hidden" name="historyId" value={entry.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-red-600 hover:underline dark:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
                {entry.reactionNotes && (
                  <p className="mt-2 text-xs italic text-neutral-700 dark:text-neutral-300">
                    &ldquo;{entry.reactionNotes}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reminders */}
      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Reminders</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Email digests sent to <span className="font-medium">{session.user.email}</span> ahead of {person.name}&rsquo;s birthday and any occasions.
            </p>
          </div>
          <form action={sendTestReminder}>
            <input type="hidden" name="personId" value={person.id} />
            <button
              type="submit"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              ✉️ Send test now
            </button>
          </form>
        </div>

        {person.reminders.length === 0 ? (
          <div className="card mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              No reminders configured.
            </p>
            <form action={backfillDefaultReminders}>
              <input type="hidden" name="personId" value={person.id} />
              <button
                type="submit"
                className="btn-primary px-3 py-1.5 text-sm"
              >
                Add default schedule
              </button>
            </form>
          </div>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {person.reminders.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div>
                  <p className="font-medium">
                    {r.leadDays === 0 ? "On the day" : `${r.leadDays} day${r.leadDays === 1 ? "" : "s"} before`}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {r.occasionId ? (
                      <>
                        {r.occasionName ?? "Occasion"}
                        {r.occasionDate ? ` · ${formatOccasionDate(r.occasionDate, false)}` : ""}
                      </>
                    ) : (
                      "Birthday"
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {r.lastSentAt
                      ? `Last sent ${new Date(r.lastSentAt).toLocaleDateString("en-GB")}${r.lastSentForYear ? ` (for ${r.lastSentForYear})` : ""}`
                      : "Never sent"}
                  </p>
                </div>
                <span className="rounded-full bg-brand-blue-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-blue-800 dark:bg-brand-blue-900/40 dark:text-brand-blue-200">
                  {r.channel}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Share wishlist */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Share wishlist</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Generate a read-only link for family to coordinate gifts — purchased and given items are always hidden.
        </p>

        {wishlistShare ? (
          <div className="card mt-3 space-y-4">
            {/* Link row */}
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Share link</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 truncate rounded-md bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">
                  {shareUrl}
                </code>
                <CopyButton
                  text={shareUrl}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                />
              </div>
              {wishlistShare.expiresAt && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Expires {new Date(wishlistShare.expiresAt).toLocaleDateString("en-GB")}
                </p>
              )}
            </div>

            {/* Settings form */}
            <form action={upsertWishlistShare} className="space-y-3">
              <input type="hidden" name="personId" value={person.id} />

              <fieldset>
                <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                  Visible statuses
                </legend>
                <div className="flex flex-wrap gap-4">
                  {(["showIdea", "showResearching", "showChosen"] as const).map((field) => (
                    <label key={field} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name={field}
                        defaultChecked={wishlistShare[field]}
                        className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                      />
                      {field === "showIdea" ? "Idea" : field === "showResearching" ? "Researching" : "Chosen"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="showPrices"
                  defaultChecked={wishlistShare.showPrices}
                  className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                />
                Show prices
              </label>

              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Expiry</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "1m", label: "1 month" },
                    { value: "3m", label: "3 months" },
                    { value: "1y", label: "1 year" },
                    { value: "never", label: "Never" },
                  ].map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="expiresPreset"
                        value={value}
                        defaultChecked={
                          value === "never"
                            ? !wishlistShare.expiresAt
                            : false
                        }
                        className="h-4 w-4 border-neutral-300 dark:border-neutral-700"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                Save settings
              </button>
            </form>

            {/* Danger actions */}
            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <form action={regenerateWishlistShare}>
                <input type="hidden" name="personId" value={person.id} />
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
                >
                  Regenerate link (invalidates old one)
                </button>
              </form>
              <form action={revokeWishlistShare}>
                <input type="hidden" name="personId" value={person.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  Remove share
                </button>
              </form>
            </div>
          </div>
        ) : (
          <form action={upsertWishlistShare} className="card mt-3 space-y-3">
            <input type="hidden" name="personId" value={person.id} />

            <fieldset>
              <legend className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Visible statuses
              </legend>
              <div className="flex flex-wrap gap-4">
                {(["showIdea", "showResearching", "showChosen"] as const).map((field) => (
                  <label key={field} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name={field}
                      defaultChecked
                      className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
                    />
                    {field === "showIdea" ? "Idea" : field === "showResearching" ? "Researching" : "Chosen"}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="showPrices"
                defaultChecked
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              Show prices
            </label>

            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Expiry</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "1m", label: "1 month" },
                  { value: "3m", label: "3 months" },
                  { value: "1y", label: "1 year" },
                  { value: "never", label: "Never" },
                ].map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="expiresPreset"
                      value={value}
                      defaultChecked={value === "never"}
                      className="h-4 w-4 border-neutral-300 dark:border-neutral-700"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
              Create share link
            </button>
          </form>
        )}
      </section>

      {/* Settings */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Settings</h2>
        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">Edit person</summary>
          <form action={updatePerson} id="edit-person-form" className="mt-4 grid gap-3 md:grid-cols-2" encType="multipart/form-data">
            <input type="hidden" name="personId" value={person.id} />
            <input name="name" defaultValue={person.name} required className={inputCls} />
            <div className="grid gap-2 sm:grid-cols-3">
              <select name="birthdayMonth" defaultValue={getBirthdayParts(person.birthday).month} required className={inputCls}>
                {[...Array(12)].map((_, index) => {
                  const month = index + 1;
                  return (
                    <option key={month} value={month.toString().padStart(2, "0")}>{month}</option>
                  );
                })}
              </select>
              <select name="birthdayDay" defaultValue={getBirthdayParts(person.birthday).day} required className={inputCls}>
                {[...Array(31)].map((_, index) => {
                  const day = index + 1;
                  return (
                    <option key={day} value={day.toString().padStart(2, "0")}>{day}</option>
                  );
                })}
              </select>
              <div id="edit-birthday-year-container">
                <input
                  name="birthdayYear"
                  type="number"
                  defaultValue={person.birthYearKnown ? person.birthday.slice(0, 4) : ""}
                  placeholder="Year"
                  className={inputCls}
                />
              </div>
            </div>
            <input name="relationship" defaultValue={person.relationship ?? ""} placeholder="Relationship" className={inputCls} />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Photo (Upload)</span>
              <input name="photoFile" type="file" accept="image/*" className={inputCls} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-500">Photo URL</span>
              <input name="photoUrl" type="url" defaultValue={person.photoUrl ?? ""} placeholder="Photo URL" className={inputCls} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                id="edit-birthyear-known"
                type="checkbox"
                name="birthYearKnown"
                defaultChecked={person.birthYearKnown}
                className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              Birth year known
            </label>
            <input
              name="budgetMin"
              type="number"
              min="0"
              step="0.01"
              defaultValue={formatPenceInput(person.budgetMin)}
              placeholder="Budget min (GBP)"
              className={inputCls}
            />
            <input
              name="budgetMax"
              type="number"
              min="0"
              step="0.01"
              defaultValue={formatPenceInput(person.budgetMax)}
              placeholder="Budget max (GBP)"
              className={inputCls}
            />
            <input name="sizeTop" defaultValue={getSizeValue(person.sizes, "top")} placeholder="Top" className={inputCls} />
            <input name="sizeBottom" defaultValue={getSizeValue(person.sizes, "bottom")} placeholder="Bottom" className={inputCls} />
            <input name="sizeShoe" defaultValue={getSizeValue(person.sizes, "shoe")} placeholder="Shoe" className={inputCls} />
            <input name="sizeRing" defaultValue={getSizeValue(person.sizes, "ring")} placeholder="Ring" className={inputCls} />
            <input
              name="tags"
              defaultValue={person.tags.join(", ")}
              placeholder="Tags (comma separated)"
              className={`${inputCls} md:col-span-2`}
            />
            <textarea name="notes" rows={3} defaultValue={person.notes ?? ""} placeholder="Notes" className={inputCls} />
            <textarea
              name="avoid"
              rows={3}
              defaultValue={person.avoid ?? ""}
              placeholder="Allergies / things to avoid"
              className={inputCls}
            />
            <button
              type="submit"
              className="btn-primary w-fit px-4 py-2 text-sm md:col-span-2"
            >
              Save changes
            </button>
          </form>
        </details>

        <form action={deletePerson} className="mt-3">
          <input type="hidden" name="personId" value={person.id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            Delete {person.name}
          </button>
        </form>
      </section>
    <script dangerouslySetInnerHTML={{ __html: `(function(){
      function pad(n) { return n.toString().padStart(2, '0'); }
      function formatDate(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
      
      function easter(y) {
        var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
        var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
        return { month: month, day: day };
      }

      function nthDay(y, m, wd, n) {
        var f = new Date(y, m - 1, 1).getDay();
        var offset = (wd - f + 7) % 7;
        return 1 + offset + 7 * (n - 1);
      }

      function getHoliday(kind, today) {
        var y = today.getFullYear();
        var d;
        if (kind === 'christmas') d = new Date(y, 11, 25);
        else if (kind === 'valentines') d = new Date(y, 1, 14);
        else if (kind === 'mothers_day') {
          var e = easter(y); d = new Date(y, e.month - 1, e.day);
          d.setDate(d.getDate() - 21);
        }
        else if (kind === 'fathers_day') d = new Date(y, 5, nthDay(y, 6, 0, 3));
        else if (kind === 'easter') {
          var e = easter(y); d = new Date(y, e.month - 1, e.day);
        }
        else return null;

        if (d < today) return getHoliday(kind, new Date(y + 1, 0, 1));
        return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
      }

      function getLabel(k) {
        var m = { christmas:'Christmas', mothers_day:"Mother's Day", fathers_day:"Father's Day", valentines:"Valentine's Day", easter:'Easter', anniversary:'Anniversary' };
        return m[k] || '';
      }

      function setup() {
        var k = document.getElementById('add-occasion-kind');
        var n = document.getElementById('add-occasion-name');
        var h = document.getElementById('add-occasion-date');
        var f = document.getElementById('add-occasion-date-fields');
        var ms = document.getElementById('add-occasion-month');
        var ds = document.getElementById('add-occasion-day');
        var p = document.getElementById('add-occasion-date-preview');
        var form = document.getElementById('add-occasion-form');
        if (!k || !h || !f || !ms || !ds || !p || !form) return;

        function sync() {
          if (k.value === 'custom' || k.value === 'anniversary') {
            h.value = formatDate(new Date().getFullYear(), Number(ms.value), Number(ds.value));
          }
        }

        function refresh() {
          var isC = (k.value === 'custom' || k.value === 'anniversary');
          f.style.setProperty('display', isC ? 'grid' : 'none', 'important');
          p.style.setProperty('display', isC ? 'none' : 'block', 'important');
          
          if (isC) {
            sync();
            if (k.value === 'anniversary' && !n.value) n.value = 'Anniversary';
          } else {
            var hol = getHoliday(k.value, new Date());
            h.value = hol || '';
            if (hol) {
              var parts = hol.split('-');
              p.textContent = parts[2] + '/' + parts[1];
            }
            if (!n.value || getLabel(n.dataset.lastK) === n.value) n.value = getLabel(k.value);
          }
          n.dataset.lastK = k.value;
        }

        k.addEventListener('change', refresh);
        ms.addEventListener('change', sync);
        ds.addEventListener('change', sync);
        form.addEventListener('submit', sync);
        refresh();
        
        // Final fallback to hide dropdowns for holidays
        setTimeout(refresh, 0);
      }

      function setupEdits() {
        document.querySelectorAll('[id^="edit-occasion-date-"]').forEach(function(h) {
          var id = h.id.replace('edit-occasion-date-', '');
          var m = document.getElementById('edit-occasion-month-' + id);
          var d = document.getElementById('edit-occasion-day-' + id);
          if (!m || !d) return;
          function s() {
            var y = h.value ? h.value.split('-')[0] : new Date().getFullYear();
            h.value = formatDate(Number(y), Number(m.value), Number(d.value));
          }
          m.addEventListener('change', s);
          d.addEventListener('change', s);
        });
      }

      function setupBirthday() {
        var c = document.getElementById('edit-birthyear-known');
        var t = document.getElementById('edit-birthday-year-container');
        if (!c || !t) return;
        function u() { t.style.display = c.checked ? 'block' : 'none'; }
        c.addEventListener('change', u);
        u();
      }

      function init() {
        setupBirthday();
        setup();
        setupEdits();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
      // Re-run for Next.js navigation
      window.setTimeout(init, 100);
    })();` }} />
    </main>
  );
}


