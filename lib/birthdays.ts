export type Birthday = {
  birthday: string; // yyyy-mm-dd
  birthYearKnown: boolean;
};

export function parseBirthday(value: string) {
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const month = Number.parseInt(monthStr ?? "", 10);
  const day = Number.parseInt(dayStr ?? "", 10);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function nextOccurrence(birthday: string, today = new Date()) {
  const parsed = parseBirthday(birthday);
  if (!parsed) return null;
  const { month, day } = parsed;
  const year = today.getFullYear();
  let candidate = new Date(year, month - 1, day);
  if (startOfDay(candidate) < startOfDay(today)) {
    candidate = new Date(year + 1, month - 1, day);
  }
  return candidate;
}

export function daysUntil(birthday: string, today = new Date()) {
  const next = nextOccurrence(birthday, today);
  if (!next) return null;
  const ms = startOfDay(next).getTime() - startOfDay(today).getTime();
  return Math.round(ms / 86_400_000);
}

export function ageOnNextBirthday({ birthday, birthYearKnown }: Birthday, today = new Date()) {
  if (!birthYearKnown) return null;
  const parsed = parseBirthday(birthday);
  const next = nextOccurrence(birthday, today);
  if (!parsed || !next) return null;
  return next.getFullYear() - parsed.year;
}

export function formatBirthday(birthday: string, includeYear: boolean) {
  const parsed = parseBirthday(birthday);
  if (!parsed) return birthday;
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

export function formatRelativeBirthday(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  if (days < 31) return `In ${days} days`;
  if (days < 60) return "Next month";
  return `In ${days} days`;
}

export function poundsFromPence(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return `£${(value / 100).toFixed(2)}`;
}
