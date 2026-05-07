'use client';

import { useState } from 'react';
import Link from 'next/link';

type PersonSettingsClientProps = {
  person: {
    id: string;
    name: string;
    birthday: string;
    birthYearKnown: boolean;
    relationship: string | null;
    photoUrl: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
    sizes: any;
    notes: string | null;
    avoid: string | null;
    tags: string[];
  };
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

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
    year: year || "",
    month: month?.padStart(2, "0") ?? "01",
    day: day?.padStart(2, "0") ?? "01",
  };
}

export function PersonSettingsClient({
  person,
  updateAction,
  deleteAction,
}: PersonSettingsClientProps) {
  const [birthYearKnown, setBirthYearKnown] = useState(person.birthYearKnown);
  const parts = getBirthdayParts(person.birthday);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Settings</h2>
      <details className="card mt-3">
        <summary className="cursor-pointer text-sm font-medium">Edit person</summary>
        <form action={updateAction} id="edit-person-form" className="mt-4 grid gap-3 md:grid-cols-2" encType="multipart/form-data">
          <input type="hidden" name="personId" value={person.id} />
          <input name="name" defaultValue={person.name} required className={inputCls} />
          
          <div className="grid gap-2 sm:grid-cols-3">
            <select name="birthdayMonth" defaultValue={parts.month} required className={inputCls}>
              {[...Array(12)].map((_, index) => {
                const month = index + 1;
                const val = month.toString().padStart(2, "0");
                return <option key={val} value={val}>{month}</option>;
              })}
            </select>
            <select name="birthdayDay" defaultValue={parts.day} required className={inputCls}>
              {[...Array(31)].map((_, index) => {
                const day = index + 1;
                const val = day.toString().padStart(2, "0");
                return <option key={val} value={val}>{day}</option>;
              })}
            </select>
            <div style={{ display: birthYearKnown ? 'block' : 'none' }}>
              <input
                name="birthdayYear"
                type="number"
                defaultValue={person.birthYearKnown ? parts.year : ""}
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
              type="checkbox"
              name="birthYearKnown"
              checked={birthYearKnown}
              onChange={(e) => setBirthYearKnown(e.target.checked)}
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

      <form action={deleteAction} className="mt-3">
        <input type="hidden" name="personId" value={person.id} />
        <button
          type="submit"
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
        >
          Delete {person.name}
        </button>
      </form>
    </section>
  );
}
