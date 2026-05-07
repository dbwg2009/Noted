import { describe, expect, it } from "vitest";
import {
  ageOnNextBirthday,
  daysUntil,
  formatBirthday,
  formatRelativeBirthday,
  nextOccurrence,
  parseBirthday,
  poundsFromPence,
} from "../birthdays";

describe("parseBirthday", () => {
  it("parses a valid date", () => {
    expect(parseBirthday("1990-05-15")).toEqual({ year: 1990, month: 5, day: 15 });
  });

  it("returns null for empty string", () => {
    expect(parseBirthday("")).toBeNull();
  });

  it("returns null for incomplete date", () => {
    expect(parseBirthday("1990-05")).toBeNull();
  });

  it("returns null for non-numeric parts", () => {
    expect(parseBirthday("xxxx-yy-zz")).toBeNull();
  });
});

describe("nextOccurrence", () => {
  it("returns this year's date when birthday is in the future", () => {
    const today = new Date(2024, 0, 1); // Jan 1
    const result = nextOccurrence("1990-06-15", today);
    expect(result).toEqual(new Date(2024, 5, 15));
  });

  it("rolls over to next year when birthday has passed this year", () => {
    const today = new Date(2024, 6, 1); // Jul 1
    const result = nextOccurrence("1990-06-15", today);
    expect(result).toEqual(new Date(2025, 5, 15));
  });

  it("returns today's date when birthday is today", () => {
    const today = new Date(2024, 5, 15); // Jun 15
    const result = nextOccurrence("1990-06-15", today);
    expect(result).toEqual(new Date(2024, 5, 15));
  });

  it("returns null for invalid birthday string", () => {
    expect(nextOccurrence("invalid")).toBeNull();
  });
});

describe("daysUntil", () => {
  it("returns 0 when birthday is today", () => {
    const today = new Date(2024, 5, 15);
    expect(daysUntil("1990-06-15", today)).toBe(0);
  });

  it("returns 1 when birthday is tomorrow", () => {
    const today = new Date(2024, 5, 14);
    expect(daysUntil("1990-06-15", today)).toBe(1);
  });

  it("returns 365/366 when birthday was yesterday (rolled over)", () => {
    const today = new Date(2024, 5, 16); // Jun 16, day after Jun 15
    const days = daysUntil("1990-06-15", today);
    expect(days).toBeGreaterThan(360);
    expect(days).toBeLessThanOrEqual(366);
  });

  it("returns null for invalid birthday", () => {
    expect(daysUntil("bad-date")).toBeNull();
  });
});

describe("ageOnNextBirthday", () => {
  it("calculates correct age when birth year is known", () => {
    const today = new Date(2024, 0, 1);
    const result = ageOnNextBirthday({ birthday: "1990-06-15", birthYearKnown: true }, today);
    expect(result).toBe(34);
  });

  it("returns null when birth year is not known", () => {
    const today = new Date(2024, 0, 1);
    const result = ageOnNextBirthday({ birthday: "1990-06-15", birthYearKnown: false }, today);
    expect(result).toBeNull();
  });

  it("returns null for invalid birthday", () => {
    expect(ageOnNextBirthday({ birthday: "invalid", birthYearKnown: true })).toBeNull();
  });
});

describe("formatBirthday", () => {
  it("formats with year when includeYear is true", () => {
    const result = formatBirthday("1990-05-15", true);
    expect(result).toContain("1990");
    expect(result).toContain("May");
    expect(result).toContain("15");
  });

  it("formats without year when includeYear is false", () => {
    const result = formatBirthday("1990-05-15", false);
    expect(result).not.toContain("1990");
    expect(result).toContain("May");
  });

  it("returns raw string for invalid input", () => {
    expect(formatBirthday("bad", true)).toBe("bad");
  });
});

describe("formatRelativeBirthday", () => {
  it("returns 'Today' for 0 days", () => {
    expect(formatRelativeBirthday(0)).toBe("Today");
  });

  it("returns 'Tomorrow' for 1 day", () => {
    expect(formatRelativeBirthday(1)).toBe("Tomorrow");
  });

  it("returns 'In N days' for 2–6 days", () => {
    expect(formatRelativeBirthday(3)).toBe("In 3 days");
    expect(formatRelativeBirthday(6)).toBe("In 6 days");
  });

  it("returns 'Next week' for 7–13 days", () => {
    expect(formatRelativeBirthday(7)).toBe("Next week");
    expect(formatRelativeBirthday(13)).toBe("Next week");
  });

  it("returns 'In N days' for 14–30 days", () => {
    expect(formatRelativeBirthday(14)).toBe("In 14 days");
    expect(formatRelativeBirthday(30)).toBe("In 30 days");
  });

  it("returns 'Next month' for 31–59 days", () => {
    expect(formatRelativeBirthday(31)).toBe("Next month");
    expect(formatRelativeBirthday(59)).toBe("Next month");
  });

  it("returns 'In N days' for 60+ days", () => {
    expect(formatRelativeBirthday(90)).toBe("In 90 days");
  });
});

describe("poundsFromPence", () => {
  it("converts pence to pounds string", () => {
    expect(poundsFromPence(2500)).toBe("£25.00");
  });

  it("handles zero", () => {
    expect(poundsFromPence(0)).toBe("£0.00");
  });

  it("handles single pence", () => {
    expect(poundsFromPence(1)).toBe("£0.01");
  });

  it("returns null for null input", () => {
    expect(poundsFromPence(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(poundsFromPence(undefined)).toBeNull();
  });
});
