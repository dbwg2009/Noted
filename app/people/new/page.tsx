import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createPerson } from "../actions";

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

export default async function NewPersonPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/people"
        className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
      >
        ← Back to people
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Add person</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Name and birthday are required. Everything else is optional and you can edit later.
      </p>

      <form action={createPerson} className="card mt-6 grid gap-4" encType="multipart/form-data">
        <Section title="Basics">
          <Field label="Name *">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="Birthday *">
            <div id="new-birthday-full" className="grid gap-1">
              <input id="new-birthday" name="birthday" type="date" required className={inputCls} />
            </div>
            <div id="new-birthday-monthday" className="hidden grid gap-2 sm:grid-cols-2">
              <select id="new-birthday-month" name="birthdayMonth" className={inputCls}>
                {[...Array(12)].map((_, index) => {
                  const month = index + 1;
                  return (
                    <option key={month} value={month.toString().padStart(2, "0")}>{month}</option>
                  );
                })}
              </select>
              <select id="new-birthday-day" name="birthdayDay" className={inputCls}>
                {[...Array(31)].map((_, index) => {
                  const day = index + 1;
                  return (
                    <option key={day} value={day.toString().padStart(2, "0")}>{day}</option>
                  );
                })}
              </select>
            </div>
          </Field>
          <Field label="Relationship">
            <input
              name="relationship"
              placeholder="e.g. Mum, best friend, brother"
              className={inputCls}
            />
          </Field>
          <Field label="Photo (Upload)">
            <input name="photoFile" type="file" accept="image/*" className={inputCls} />
          </Field>
          <Field label="Photo URL">
            <input name="photoUrl" type="url" placeholder="https://..." className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              id="new-birthyear-known"
              type="checkbox"
              name="birthYearKnown"
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-700"
            />
            Birth year known
          </label>
        </Section>

        <Section title="Budget">
          <Field label="Min (GBP)">
            <input name="budgetMin" type="number" min="0" step="0.01" className={inputCls} />
          </Field>
          <Field label="Max (GBP)">
            <input name="budgetMax" type="number" min="0" step="0.01" className={inputCls} />
          </Field>
        </Section>

        <Section title="Sizes (optional)">
          <Field label="Top">
            <input name="sizeTop" className={inputCls} />
          </Field>
          <Field label="Bottom">
            <input name="sizeBottom" className={inputCls} />
          </Field>
          <Field label="Shoe">
            <input name="sizeShoe" className={inputCls} />
          </Field>
          <Field label="Ring">
            <input name="sizeRing" className={inputCls} />
          </Field>
        </Section>

        <Section title="Personalisation">
          <Field label="Tags (comma separated)">
            <input
              name="tags"
              placeholder="gamer, reader, outdoorsy"
              className={`${inputCls} md:col-span-2`}
            />
          </Field>
          <Field label="Notes" full>
            <textarea
              name="notes"
              rows={3}
              placeholder="Loves dark chocolate, hates surprise parties…"
              className={inputCls}
            />
          </Field>
          <Field label="Allergies / things to avoid" full>
            <textarea name="avoid" rows={3} className={inputCls} />
          </Field>
        </Section>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="btn-primary px-4 py-2 text-sm"
          >
            Save person
          </button>
          <Link
            href="/people"
            className="text-sm text-neutral-600 hover:underline dark:text-neutral-400"
          >
            Cancel
          </Link>
        </div>
      </form>
      <script dangerouslySetInnerHTML={{ __html: `(function(){
        var checkbox = document.getElementById('new-birthyear-known');
        var full = document.getElementById('new-birthday-full');
        var monthDay = document.getElementById('new-birthday-monthday');
        var fullInput = document.getElementById('new-birthday');
        function toggle() {
          if (!checkbox || !full || !monthDay || !fullInput) return;
          if (checkbox.checked) {
            full.classList.remove('hidden');
            monthDay.classList.add('hidden');
            fullInput.required = true;
          } else {
            full.classList.add('hidden');
            monthDay.classList.remove('hidden');
            fullInput.required = false;
          }
        }
        checkbox?.addEventListener('change', toggle);
        toggle();
      })();` }} />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 md:grid-cols-2">
      <legend className="col-span-full text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  full = false,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-medium ${full ? "md:col-span-2" : ""}`}>
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
