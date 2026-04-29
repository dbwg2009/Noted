import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  addManualProduct,
  createPerson,
  createWishlistItem,
  deletePerson,
  deleteProduct,
  deleteWishlistItem,
  findProductsForWishlistItem,
  listPeopleForCurrentUser,
  updatePerson,
  updateWishlistItem,
} from "./actions";

function formatPence(value: number | null) {
  if (value === null) return "";
  return (value / 100).toFixed(2);
}

function getSizeValue(sizes: Record<string, string> | null, key: string) {
  if (!sizes || typeof sizes !== "object") return "";
  const value = sizes[key];
  return typeof value === "string" ? value : "";
}

function poundsFromPence(value: number | null) {
  if (value === null) return null;
  return `£${(value / 100).toFixed(2)}`;
}

export default async function PeoplePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await listPeopleForCurrentUser();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Track birthdays, budgets, and useful notes for each person.
        </p>
      </div>

      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-base font-semibold">Add person</h2>
        <form action={createPerson} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            name="name"
            placeholder="Name"
            required
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="birthday"
            type="date"
            required
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="relationship"
            placeholder="Relationship (optional)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="photoUrl"
            type="url"
            placeholder="Photo URL (optional)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="birthYearKnown"
              defaultChecked
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            Birth year known
          </label>
          <input
            name="budgetMin"
            type="number"
            min="0"
            step="0.01"
            placeholder="Budget min (GBP)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="budgetMax"
            type="number"
            min="0"
            step="0.01"
            placeholder="Budget max (GBP)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="sizeTop"
            placeholder="Top size (optional)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="sizeBottom"
            placeholder="Bottom size (optional)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="sizeShoe"
            placeholder="Shoe size (optional)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="sizeRing"
            placeholder="Ring size (optional)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <input
            name="tags"
            placeholder="Tags (comma separated)"
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
          />
          <textarea
            name="notes"
            placeholder="Notes"
            rows={3}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <textarea
            name="avoid"
            placeholder="Allergies / things to avoid"
            rows={3}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
          >
            Save person
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-base font-semibold">Saved people</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No people yet. Add your first one above.
          </p>
        ) : (
          rows.map((person) => (
            <article
              key={person.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <form action={updatePerson} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="personId" value={person.id} />
                <input
                  name="name"
                  defaultValue={person.name}
                  required
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="birthday"
                  type="date"
                  defaultValue={person.birthday}
                  required
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="relationship"
                  defaultValue={person.relationship ?? ""}
                  placeholder="Relationship (optional)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="photoUrl"
                  type="url"
                  defaultValue={person.photoUrl ?? ""}
                  placeholder="Photo URL (optional)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
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
                  defaultValue={formatPence(person.budgetMin)}
                  placeholder="Budget min (GBP)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="budgetMax"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={formatPence(person.budgetMax)}
                  placeholder="Budget max (GBP)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="sizeTop"
                  defaultValue={getSizeValue(person.sizes, "top")}
                  placeholder="Top size (optional)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="sizeBottom"
                  defaultValue={getSizeValue(person.sizes, "bottom")}
                  placeholder="Bottom size (optional)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="sizeShoe"
                  defaultValue={getSizeValue(person.sizes, "shoe")}
                  placeholder="Shoe size (optional)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="sizeRing"
                  defaultValue={getSizeValue(person.sizes, "ring")}
                  placeholder="Ring size (optional)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  name="tags"
                  defaultValue={person.tags.join(", ")}
                  placeholder="Tags (comma separated)"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                />
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={person.notes ?? ""}
                  placeholder="Notes"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <textarea
                  name="avoid"
                  rows={2}
                  defaultValue={person.avoid ?? ""}
                  placeholder="Allergies / things to avoid"
                  className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                />
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
                  >
                    Update
                  </button>
                </div>
              </form>
              <form action={deletePerson} className="mt-2">
                <input type="hidden" name="personId" value={person.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </form>

              <div className="mt-5 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                <h3 className="text-sm font-semibold">Wishlist</h3>
                <form action={createWishlistItem} className="mt-3 grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="personId" value={person.id} />
                  <input
                    name="description"
                    required
                    placeholder="What they want"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                  />
                  <input
                    name="sourceNote"
                    placeholder="Source note (where/when you heard it)"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                  />
                  <input
                    name="heardOn"
                    type="date"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  <select
                    name="status"
                    defaultValue="idea"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
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
                    placeholder="Price min (GBP)"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  <input
                    name="priceMax"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price max (GBP)"
                    className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 md:col-span-2"
                  >
                    Add wishlist item
                  </button>
                </form>

                {person.wishlist.length === 0 ? (
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                    No wishlist items yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {person.wishlist.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                      >
                        <form action={updateWishlistItem} className="grid gap-2 md:grid-cols-2">
                          <input type="hidden" name="wishlistItemId" value={item.id} />
                          <input
                            name="description"
                            required
                            defaultValue={item.description}
                            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                          />
                          <input
                            name="sourceNote"
                            defaultValue={item.sourceNote ?? ""}
                            placeholder="Source note"
                            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                          />
                          <input
                            name="heardOn"
                            type="date"
                            defaultValue={item.heardOn ?? ""}
                            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                          <select
                            name="status"
                            defaultValue={item.status}
                            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          >
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
                            defaultValue={formatPence(item.priceMin)}
                            placeholder="Price min (GBP)"
                            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                          <input
                            name="priceMax"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={formatPence(item.priceMax)}
                            placeholder="Price max (GBP)"
                            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                          />
                          <button
                            type="submit"
                            className="w-fit rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 md:col-span-2"
                          >
                            Update item
                          </button>
                        </form>
                        <form action={deleteWishlistItem} className="mt-2">
                          <input type="hidden" name="wishlistItemId" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                          >
                            Delete item
                          </button>
                        </form>

                        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                          <div className="flex flex-wrap items-center gap-2">
                            <form action={findProductsForWishlistItem}>
                              <input type="hidden" name="wishlistItemId" value={item.id} />
                              <button
                                type="submit"
                                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                              >
                                Find products (AI)
                              </button>
                            </form>
                          </div>

                          <form action={addManualProduct} className="mt-3 grid gap-2 md:grid-cols-4">
                            <input type="hidden" name="wishlistItemId" value={item.id} />
                            <input
                              name="title"
                              required
                              placeholder="Manual product title"
                              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                            />
                            <input
                              name="url"
                              type="url"
                              required
                              placeholder="https://..."
                              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2"
                            />
                            <input
                              name="retailer"
                              placeholder="Retailer (optional)"
                              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                            />
                            <input
                              name="price"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price GBP"
                              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                            />
                            <button
                              type="submit"
                              className="w-fit rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900 md:col-span-2"
                            >
                              Save manual product
                            </button>
                          </form>

                          {item.products.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {item.products.map((product) => (
                                <div
                                  key={product.id}
                                  className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <a
                                      href={product.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
                                    >
                                      {product.title}
                                    </a>
                                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                      {product.source === "ai_search" ? "AI" : "Manual"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                                    {[product.retailer ?? "Unknown retailer", poundsFromPence(product.price)]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </p>
                                  <form action={deleteProduct} className="mt-2">
                                    <input type="hidden" name="productId" value={product.id} />
                                    <button
                                      type="submit"
                                      className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                                    >
                                      Remove product
                                    </button>
                                  </form>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
