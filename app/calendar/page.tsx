import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listPeopleSummary, requireCurrentUserId } from "@/lib/people-queries";
import { listUpcomingOccasions } from "@/lib/occasions-queries";
import { nextOccurrenceDate } from "@/lib/occasions";
import { parseBirthday } from "@/lib/birthdays";
import { Avatar } from "@/components/badges";
import { cn } from "@/lib/cn";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SearchParams = { month?: string; year?: string };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = await requireCurrentUserId();
  const allPeople = await listPeopleSummary(userId);

  const params = await searchParams;
  const today = new Date();
  const month = clampMonth(params.month) ?? today.getMonth();
  const year = clampYear(params.year) ?? today.getFullYear();

  const peopleByDay = new Map<number, typeof allPeople>();
  for (const person of allPeople) {
    const parsed = parseBirthday(person.birthday);
    if (!parsed) continue;
    if (parsed.month - 1 !== month) continue;
    const list = peopleByDay.get(parsed.day) ?? [];
    list.push(person);
    peopleByDay.set(parsed.day, list);
  }

  // Load occasions and map any that occur in this month
  const occasions = await listUpcomingOccasions(userId, 100);
  const occasionsByDay = new Map<number, Array<typeof occasions[0]>>();
  for (const occ of occasions) {
    if (!occ.nextDate) continue;
    const [yStr, mStr, dStr] = occ.nextDate.split("-");
    const oy = Number.parseInt(yStr, 10);
    const om = Number.parseInt(mStr, 10) - 1;
    const od = Number.parseInt(dStr, 10);
    if (oy !== year || om !== month) continue;
    const list = occasionsByDay.get(od) ?? [];
    list.push(occ);
    occasionsByDay.set(od, list);
  }

  const firstDay = new Date(year, month, 1);
  // weekday: 0 = Sunday, but we want Mon=0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; isToday: boolean; matches: typeof allPeople }> = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: null, isToday: false, matches: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      isToday: today.getFullYear() === year && today.getMonth() === month && today.getDate() === d,
        matches: peopleByDay.get(d) ?? [],
        occasions: occasionsByDay.get(d) ?? [],
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, isToday: false, matches: [] });

  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {MONTH_NAMES[month]} {year}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {peopleSummary(allPeople, month)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${prev.month}&year=${prev.year}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            ← Prev
          </Link>
          <Link
            href="/calendar"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Today
          </Link>
          <Link
            href={`/calendar?month=${next.month}&year=${next.year}`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="card mt-6 overflow-x-auto p-0">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell, i) => (
              <div
                key={i}
                className={cn(
                  "min-h-[88px] border-b border-r border-neutral-200 p-2 text-xs dark:border-neutral-800",
                  (i + 1) % 7 === 0 && "border-r-0",
                  i >= cells.length - 7 && "border-b-0",
                  cell.day === null && "bg-neutral-50/50 dark:bg-neutral-900/40",
                )}
              >
                {cell.day !== null && (
                  <>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold",
                          cell.isToday
                            ? "bg-rose-500 text-white"
                            : "text-neutral-600 dark:text-neutral-400",
                        )}
                      >
                        {cell.day}
                      </span>
                    </div>
                    <ul className="mt-1 space-y-1">
                      {cell.matches.map((person) => (
                        <li key={person.id}>
                          <Link
                            href={`/people/${person.id}`}
                            className="flex items-center gap-1 truncate rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-medium text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:hover:bg-rose-900"
                          >
                            <Avatar name={person.name} photoUrl={person.photoUrl} size={16} />
                            <span className="truncate">{person.name}</span>
                          </Link>
                        </li>
                      ))}
                      {cell.occasions.map((occ) => (
                        <li key={`occ-${occ.id}`}>
                          <Link
                            href={occ.personId ? `/people/${occ.personId}` : "/people"}
                            className="flex items-center gap-1 truncate rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
                          >
                            <span className="truncate">{occ.name ?? occ.kind}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function clampMonth(value: string | undefined) {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n) || n < 0 || n > 11) return null;
  return n;
}

function clampYear(value: string | undefined) {
  const n = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(n) || n < 1900 || n > 2100) return null;
  return n;
}

function prevMonth(year: number, month: number) {
  return month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

function peopleSummary(people: Array<{ birthday: string }>, month: number) {
  const count = people.filter((p) => {
    const parsed = parseBirthday(p.birthday);
    return parsed && parsed.month - 1 === month;
  }).length;
  if (count === 0) return "No birthdays this month.";
  return `${count} ${count === 1 ? "birthday" : "birthdays"} this month.`;
}
