'use client';

import { useState } from 'react';

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

const KINDS = [
  { value: 'anniversary', label: 'Anniversary', hasDate: true },
  { value: 'christmas', label: 'Christmas', hasDate: false },
  { value: 'mothers_day', label: "Mother's Day", hasDate: false },
  { value: 'fathers_day', label: "Father's Day", hasDate: false },
  { value: 'valentines', label: "Valentine's Day", hasDate: false },
  { value: 'easter', label: 'Easter', hasDate: false },
  { value: 'custom', label: 'Custom', hasDate: true },
];

const MONTHS = [...Array(12)].map((_, i) => ({
  value: (i + 1).toString().padStart(2, '0'),
  label: new Date(2000, i).toLocaleString('en-GB', { month: 'long' }),
}));

const DAYS = [...Array(31)].map((_, i) => ({
  value: (i + 1).toString().padStart(2, '0'),
  label: i + 1,
}));

function Form({
  personId,
  createAction,
  onCancel,
}: {
  personId: string;
  createAction: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState('anniversary');
  const selected = KINDS.find(k => k.value === kind)!;

  return (
    <div className="card mt-3">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">New occasion</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Cancel
        </button>
      </div>

      <form action={createAction} className="grid gap-3">
        <input type="hidden" name="personId" value={personId} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Type</label>
            <select
              name="kind"
              required
              className={inputCls}
              value={kind}
              onChange={e => setKind(e.target.value)}
            >
              {KINDS.map(k => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Name <span className="font-normal text-neutral-400">(optional)</span>
            </label>
            <input
              name="name"
              autoComplete="new-password"
              placeholder={selected.hasDate ? 'e.g. Wedding anniversary' : selected.label}
              className={inputCls}
            />
          </div>
        </div>

        {selected.hasDate && (
          <div className="grid gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Date</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <select name="occasionMonth" defaultValue="01" className={inputCls}>
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select name="occasionDay" defaultValue="01" className={inputCls}>
                {DAYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="grid gap-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Notes <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <textarea name="notes" rows={2} autoComplete="off" className={inputCls} />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary px-4 py-2 text-sm">
            Add occasion
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function AddOccasionForm({
  personId,
  createAction,
}: {
  personId: string;
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);

  function handleOpen() {
    setKey(k => k + 1);
    setOpen(true);
  }

  if (open) {
    return (
      <Form
        key={key}
        personId={personId}
        createAction={createAction}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      + Add occasion
    </button>
  );
}
