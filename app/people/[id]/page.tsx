import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getPersonDetail, requireCurrentUserId } from "@/lib/people-queries";
import { Avatar, CountdownBadge, StatusPill, TagChip } from "@/components/badges";
import { formatBirthday, poundsFromPence } from "@/lib/birthdays";
import {
  addManualProduct,
  createWishlistItem,
  deletePerson,
  deleteProduct,
  deleteWishlistItem,
  findProductsForWishlistItem,
  updatePerson,
  updateWishlistItem,
} from "../actions";

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";

function formatPenceInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}

function getSizeValue(sizes: Record<string, string> | null, key: string) {
  if (!sizes || typeof sizes !== "object") return "";
  const v = sizes[key];
  return typeof v === "string" ? v : "";
}

export default async function PersonDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const userId = await requireCurrentUserId();
  const person = await getPersonDetail(id, userId);
  if (!person) notFound();

  const flashRaw = (await cookies()).get("people_flash")?.value;
  let flash: { message: string; tone: "success" | "warning" | "error" } | null = null;
  if (flashRaw) {
    try {
      flash = JSON.parse(flashRaw) as typeof flash;
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
              className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 md:col-span-2"
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
                          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
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
                    <button
                      type="submit"
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      🔎 Find products (AI)
                    </button>
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
                            className="line-clamp-2 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
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

      {/* Settings */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Settings</h2>
        <details className="card mt-3">
          <summary className="cursor-pointer text-sm font-medium">Edit person</summary>
          <form action={updatePerson} className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="personId" value={person.id} />
            <input name="name" defaultValue={person.name} required className={inputCls} />
            <input name="birthday" type="date" defaultValue={person.birthday} required className={inputCls} />
            <input name="relationship" defaultValue={person.relationship ?? ""} placeholder="Relationship" className={inputCls} />
            <input name="photoUrl" type="url" defaultValue={person.photoUrl ?? ""} placeholder="Photo URL" className={inputCls} />
            <label className="flex items-center gap-2 text-sm">
              <input
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
              className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 md:col-span-2"
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
    </main>
  );
}
