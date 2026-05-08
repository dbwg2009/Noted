"use client";

import { useState } from "react";
import { getKnownOccasionLabel } from "@/lib/occasions";

export type OccasionOption = {
  id: number;
  name: string | null;
  kind: string;
  isSiteWide: boolean;
};

type WishlistItemData = {
  id: string;
  description: string;
  sourceNote: string | null;
  heardOn: string | null;
  status: string;
  priceMin: number | null;
  priceMax: number | null;
  occasionId: number | null;
};

type Props = {
  item: WishlistItemData;
  occasions: OccasionOption[];
  updateAction: (fd: FormData) => Promise<void>;
  markGivenAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
  inputCls: string;
};

function formatPenceInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}

function occasionLabel(o: OccasionOption) {
  const name = o.name ?? getKnownOccasionLabel(o.kind);
  return o.isSiteWide ? `${name} (site-wide)` : name;
}

export function WishlistItemEditForm({ item, occasions, updateAction, markGivenAction, deleteAction, inputCls }: Props) {
  const [pendingGiven, setPendingGiven] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-neutral-600 hover:underline dark:text-neutral-400">
        Edit
      </summary>

      {pendingGiven ? (
        <div className="mt-3">
          <p className="mb-2 text-neutral-500 dark:text-neutral-400">
            Fill in the details to record this gift as given.
          </p>
          <form action={markGivenAction} className="grid gap-2 md:grid-cols-3">
            <input type="hidden" name="wishlistItemId" value={item.id} />
            <input name="givenOn" type="date" required defaultValue={today} className={inputCls} />
            <input name="pricePaid" type="number" step="0.01" min="0" placeholder="Price paid (GBP)" className={inputCls} />
            <input name="reactionNotes" placeholder="Their reaction" className={inputCls} />
            <div className="flex items-center gap-2 md:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
              >
                Record gift
              </button>
              <button
                type="button"
                onClick={() => setPendingGiven(false)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <form action={updateAction} className="mt-3 grid gap-2 md:grid-cols-2">
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
            <select
              name="status"
              defaultValue={item.status}
              onChange={(e) => { if (e.target.value === "given") setPendingGiven(true); }}
              className={inputCls}
            >
              <option value="idea">idea</option>
              <option value="researching">researching</option>
              <option value="chosen">chosen</option>
              <option value="purchased">purchased</option>
              <option value="given">given</option>
            </select>
            <select
              name="occasionId"
              defaultValue={item.occasionId ?? ""}
              className={`${inputCls} md:col-span-2`}
            >
              <option value="">No occasion</option>
              {occasions.map((o) => (
                <option key={o.id} value={o.id}>
                  {occasionLabel(o)}
                </option>
              ))}
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
              <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                Save
              </button>
            </div>
          </form>

          <form action={deleteAction} className="mt-2">
            <input type="hidden" name="wishlistItemId" value={item.id} />
            <button
              type="submit"
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            >
              Delete item
            </button>
          </form>
        </>
      )}
    </details>
  );
}
