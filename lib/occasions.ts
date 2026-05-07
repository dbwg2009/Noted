export type OccasionAnchor = {
  year: number;
  month: number;
  day: number;
};

export function parseOccasionDate(value: string | null) {
  if (!value) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number.parseInt(yearStr ?? "", 10);
  const month = Number.parseInt(monthStr ?? "", 10);
  const day = Number.parseInt(dayStr ?? "", 10);
  if (!year || !month || !day) return null;
  return { year, month, day } as OccasionAnchor;
}

function formatDateAnchor(anchor: OccasionAnchor) {
  const year = anchor.year.toString().padStart(4, "0");
  const month = anchor.month.toString().padStart(2, "0");
  const day = anchor.day.toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function easterSunday(year: number): OccasionAnchor {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { year, month, day };
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): OccasionAnchor {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (weekday - firstDay + 7) % 7;
  const day = 1 + offset + 7 * (n - 1);
  return { year, month, day };
}

function getKnownOccasionAnchor(kind: string, referenceYear = new Date().getFullYear()): OccasionAnchor | null {
  switch (kind) {
    case "christmas":
      return { year: referenceYear, month: 12, day: 25 };
    case "valentines":
      return { year: referenceYear, month: 2, day: 14 };
    case "mothers_day": {
      const easter = easterSunday(referenceYear);
      const date = new Date(easter.year, easter.month - 1, easter.day);
      date.setDate(date.getDate() - 21);
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    }
    case "fathers_day":
      return nthWeekdayOfMonth(referenceYear, 6, 0, 3);
    case "easter":
      return easterSunday(referenceYear);
    default:
      return null;
  }
}

export function getKnownOccasionDate(kind: string, today = new Date()): string | null {
  const year = today.getFullYear();
  let anchor = getKnownOccasionAnchor(kind, year);
  if (!anchor) return null;

  const candidate = new Date(anchor.year, anchor.month - 1, anchor.day);
  if (candidate < today) {
    anchor = getKnownOccasionAnchor(kind, year + 1) ?? anchor;
  }

  return formatDateAnchor(anchor);
}

export function getKnownOccasionLabel(kind: string) {
  switch (kind) {
    case "anniversary":
      return "Anniversary";
    case "christmas":
      return "Christmas";
    case "mothers_day":
      return "Mother's Day";
    case "fathers_day":
      return "Father's Day";
    case "valentines":
      return "Valentine's Day";
    case "easter":
      return "Easter";
    case "custom":
      return "Custom";
    default:
      return kind;
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function nextOccurrenceDate(occasionDate: string | null, yearRecurring = true, today = new Date(), kind?: string): Date | null {
  if (!occasionDate && kind) {
    occasionDate = getKnownOccasionDate(kind, today);
  }
  if (!occasionDate) return null;
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

export function daysUntilOccasion(occasionDate: string | null, yearRecurring = true, today = new Date(), kind?: string): number | null {
  if (!occasionDate && kind) {
    occasionDate = getKnownOccasionDate(kind, today);
  }
  if (!occasionDate) return null;
  const next = nextOccurrenceDate(occasionDate, yearRecurring, today, kind);
  if (!next) return null;
  const ms = startOfDay(next).getTime() - startOfDay(today).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatOccasionDate(occasionDate: string | null, includeYear = true, kind?: string) {
  if (!occasionDate && kind) {
    occasionDate = getKnownOccasionDate(kind);
  }
  if (!occasionDate) return "";
  const parsed = parseOccasionDate(occasionDate);
  if (!parsed) return occasionDate ?? "";
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}
