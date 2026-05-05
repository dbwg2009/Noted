'use client';

import { useState, useEffect } from 'react';
import { formatOccasionDate } from '@/lib/occasions';

type Occasion = {
  id: number;
  kind: string;
  name: string | null;
  date: string | null;
  notes: string | null;
};

type OccasionSectionClientProps = {
  personId: string;
  initialOccasions: Occasion[];
  createAction: (formData: FormData) => Promise<void>;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

const inputCls =
  "rounded-md border border-neutral-300 bg-white px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-900";

function pad(n: number) { return n.toString().padStart(2, '0'); }
function formatDate(year: number, month: number, day: number) { return year + '-' + pad(month) + '-' + pad(day); }

function easter(year: number) {
  var a = year % 19, b = Math.floor(year / 100), c = year % 100;
  var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  var month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number) {
  var firstDay = new Date(year, month - 1, 1).getDay();
  var offset = (weekday - firstDay + 7) % 7;
  return 1 + offset + 7 * (n - 1);
}

function getHolidayDate(kind: string, today: Date): string | null {
  var year = today.getFullYear();
  var date: Date;
  switch (kind) {
    case 'christmas': date = new Date(year, 11, 25); break;
    case 'valentines': date = new Date(year, 1, 14); break;
    case 'mothers_day': {
      var e = easter(year);
      date = new Date(year, e.month - 1, e.day);
      date.setDate(date.getDate() - 21);
      break;
    }
    case 'fathers_day': date = new Date(year, 5, nthWeekdayOfMonth(year, 6, 0, 3)); break;
    case 'easter': {
      var e = easter(year);
      date = new Date(year, e.month - 1, e.day);
      break;
    }
    default: return null;
  }
  if (date < today) {
    return getHolidayDate(kind, new Date(year + 1, 0, 1));
  }
  return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function getOccasionLabel(kind: string) {
  switch (kind) {
    case 'christmas': return 'Christmas';
    case 'mothers_day': return "Mother's Day";
    case 'fathers_day': return "Father's Day";
    case 'valentines': return "Valentine's Day";
    case 'easter': return 'Easter';
    case 'anniversary': return 'Anniversary';
    default: return '';
  }
}

export function OccasionSectionClient({
  personId,
  initialOccasions,
  createAction,
  updateAction,
  deleteAction,
}: OccasionSectionClientProps) {
  const [addKind, setAddKind] = useState('anniversary');
  const [addName, setAddName] = useState('');
  const [addMonth, setAddMonth] = useState('01');
  const [addDay, setAddDay] = useState('01');
  const [lastKind, setLastKind] = useState('');

  // When kind changes, auto-populate name and set initial date if needed
  useEffect(() => {
    const isCustom = addKind === 'custom' || addKind === 'anniversary';
    if (!isCustom) {
      if (!addName || getOccasionLabel(lastKind) === addName) {
        setAddName(getOccasionLabel(addKind));
      }
    } else if (addKind === 'anniversary' && !addName) {
      setAddName('Anniversary');
    }
    setLastKind(addKind);
  }, [addKind]);

  const isAddCustom = addKind === 'custom' || addKind === 'anniversary';
  const holidayDate = !isAddCustom ? getHolidayDate(addKind, new Date()) : null;
  const finalAddDate = isAddCustom 
    ? formatDate(new Date().getFullYear(), Number(addMonth), Number(addDay))
    : (holidayDate || '');

  return (
    <section className="mt-10">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-semibold">Occasions</h2>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {initialOccasions.length} {initialOccasions.length === 1 ? "occasion" : "occasions"}
        </span>
      </div>

      <details className="card mt-3">
        <summary className="cursor-pointer text-sm font-medium">+ Add occasion</summary>
        <form action={createAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="personId" value={personId} />
          <select 
            name="kind" 
            required 
            className={inputCls}
            value={addKind}
            onChange={(e) => setAddKind(e.target.value)}
          >
            <option value="anniversary">Anniversary</option>
            <option value="christmas">Christmas</option>
            <option value="mothers_day">Mother's Day</option>
            <option value="fathers_day">Father's Day</option>
            <option value="valentines">Valentine's Day</option>
            <option value="easter">Easter</option>
            <option value="custom">Custom</option>
          </select>
          <input 
            name="name" 
            placeholder="Name (optional for holidays)" 
            className={inputCls}
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />
          <input type="hidden" name="date" value={finalAddDate} />
          
          <div className="grid gap-1">
            {isAddCustom ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select 
                  name="occasionMonth" 
                  className={inputCls}
                  value={addMonth}
                  onChange={(e) => setAddMonth(e.target.value)}
                >
                  {[...Array(12)].map((_, index) => {
                    const month = index + 1;
                    const val = month.toString().padStart(2, "0");
                    return <option key={val} value={val}>{month}</option>;
                  })}
                </select>
                <select 
                  name="occasionDay" 
                  className={inputCls}
                  value={addDay}
                  onChange={(e) => setAddDay(e.target.value)}
                >
                  {[...Array(31)].map((_, index) => {
                    const day = index + 1;
                    const val = day.toString().padStart(2, "0");
                    return <option key={val} value={val}>{day}</option>;
                  })}
                </select>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 px-3 py-2">
                {holidayDate ? holidayDate.split('-').slice(1).reverse().join('/') : ''}
              </p>
            )}
          </div>
          <textarea name="notes" rows={2} placeholder="Notes" className={`${inputCls} md:col-span-2`} />
          <button type="submit" className="btn-primary w-fit px-4 py-2 text-sm md:col-span-2">Add occasion</button>
        </form>
      </details>

      {initialOccasions.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No occasions yet for this person.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {initialOccasions.map((o) => (
            <OccasionItem 
              key={o.id} 
              occasion={o} 
              updateAction={updateAction}
              deleteAction={deleteAction}
            />
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
  const finalEditDate = isCustom 
    ? formatDate(Number(o.date?.slice(0, 4) || new Date().getFullYear()), Number(editMonth), Number(editDay))
    : (o.date || '');

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
            <input type="hidden" name="date" value={finalEditDate} />
            <input name="name" defaultValue={o.name ?? ""} className={inputCls} />
            {isCustom ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  name="occasionMonth"
                  value={editMonth}
                  onChange={(e) => setEditMonth(e.target.value)}
                  className={inputCls}
                >
                  {[...Array(12)].map((_, index) => {
                    const month = index + 1;
                    const val = month.toString().padStart(2, "0");
                    return <option key={val} value={val}>{month}</option>;
                  })}
                </select>
                <select
                  name="occasionDay"
                  value={editDay}
                  onChange={(e) => setEditDay(e.target.value)}
                  className={inputCls}
                >
                  {[...Array(31)].map((_, index) => {
                    const day = index + 1;
                    const val = day.toString().padStart(2, "0");
                    return <option key={val} value={val}>{day}</option>;
                  })}
                </select>
              </div>
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
          <form action={deleteAction} className="mt-2">
            <input type="hidden" name="occasionId" value={o.id} />
            <button type="submit" className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">Delete</button>
          </form>
        </details>
      </div>
    </li>
  );
}
