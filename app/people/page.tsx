import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPerson, deletePerson, listPeopleForCurrentUser, updatePerson } from "./actions";

function formatPence(value: number | null) {
  if (value === null) return "";
  return (value / 100).toFixed(2);
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
            </article>
          ))
        )}
      </section>
    </main>
  );
}
