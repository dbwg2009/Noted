export type OccasionAnchor = {
  year: number;
  month: number;
  day: number;
};

export function parseOccasionDate(value: string) {
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const month = Number.parseInt(monthStr ?? "", 10);
  const day = Number.parseInt(dayStr ?? "", 10);
  if (!year || !month || !day) return null;
  return { year, month, day } as OccasionAnchor;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function nextOccurrenceDate(occasionDate: string, yearRecurring = true, today = new Date()): Date | null {
  const parsed = parseOccasionDate(occasionDate);
  if (!parsed) return null;
  const { year, month, day } = parsed;
  if (!yearRecurring) {
    const candidate = new Date(year, month - 1, day);
    return startOfDay(candidate) >= startOfDay(today) ? candidate : null;
  }

  const candidateYear = today.getFullYear();
  let candidate = new Date(candidateYear, month - 1, day);
  if (startOfDay(candidate) < startOfDay(today)) {
    candidate = new Date(candidateYear + 1, month - 1, day);
  }
  return candidate;
}

export function daysUntilOccasion(occasionDate: string, yearRecurring = true, today = new Date()): number | null {
  const next = nextOccurrenceDate(occasionDate, yearRecurring, today);
  if (!next) return null;
  const ms = startOfDay(next).getTime() - startOfDay(today).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatOccasionDate(occasionDate: string, includeYear = true) {
  const parsed = parseOccasionDate(occasionDate);
  if (!parsed) return occasionDate;
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}
