'use client';

import { useState } from 'react';
import { formatOccasionDate } from '@/lib/occasions';

type Occasion = {
  id: number;
  kind: string;
  name: string | null;
  date: string | null;
  notes: string | null;
};

type OccasionSectionClientProps = {
  initialOccasions: Occasion[];
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

const MONTH_OPTIONS = [...Array(12)].map((_, i) => ({ value: (i + 1).toString().padStart(2, "0"), label: i + 1 }));
const DAY_OPTIONS = [...Array(31)].map((_, i) => ({ value: (i + 1).toString().padStart(2, "0"), label: i + 1 }));

export function OccasionSectionClient({
  initialOccasions,
  updateAction,
  deleteAction,
}: OccasionSectionClientProps) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold">Occasions</h2>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {initialOccasions.length} {initialOccasions.length === 1 ? "occasion" : "occasions"}
        </span>
      </div>

      {initialOccasions.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No occasions yet for this person.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {initialOccasions.map((o) => (
            <OccasionItem key={o.id} occasion={o} updateAction={updateAction} deleteAction={deleteAction} />
          ))}
        </ul>
      )}
    </section>
  );
}

function OccasionItem({ occasion: o, updateAction, deleteAction }: {
  occasion: Occasion;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editMonth, setEditMonth] = useState(o.date?.slice(5, 7) ?? '01');
  const [editDay, setEditDay] = useState(o.date?.slice(8, 10) ?? '01');
  const isCustom = o.kind === 'custom' || o.kind === 'anniversary';

  return (
    <li className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{o.name ?? o.kind}</p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{formatOccasionDate(o.date, false, o.kind)}</p>
        </div>
        <details>
          <summary className="cursor-pointer text-xs text-neutral-600 hover:underline dark:text-neutral-400">Edit</summary>
          <form action={updateAction} className="mt-2 grid gap-2">
            <input type="hidden" name="occasionId" value={o.id} />
            <input type="hidden" name="kind" value={o.kind} />
            <input name="name" defaultValue={o.name ?? ""} autoComplete="new-password" className={inputCls} />
            {isCustom ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select name="occasionMonth" value={editMonth} onChange={(e) => setEditMonth(e.target.value)} className={inputCls}>
                  {MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select name="occasionDay" value={editDay} onChange={(e) => setEditDay(e.target.value)} className={inputCls}>
                  {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            ) : (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                {formatOccasionDate(o.date, false, o.kind)}
              </div>
            )}
            <textarea name="notes" rows={2} defaultValue={o.notes ?? ""} autoComplete="off" className={inputCls} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Save</button>
            </div>
          </form>
          <form action={deleteAction} className="mt-2">
            <input type="hidden" name="occasionId" value={o.id} />
            <button type="submit" className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">Delete</button>
          </form>
        </details>
      </div>
    </li>
  );
}
