import { describe, expect, it } from "vitest";
import {
  daysUntilOccasion,
  formatOccasionDate,
  getKnownOccasionDate,
  getKnownOccasionLabel,
  nextOccurrenceDate,
  parseOccasionDate,
} from "../occasions";

describe("parseOccasionDate", () => {
  it("parses a valid date", () => {
    expect(parseOccasionDate("2024-12-25")).toEqual({ year: 2024, month: 12, day: 25 });
  });

  it("returns null for null input", () => {
    expect(parseOccasionDate(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOccasionDate("")).toBeNull();
  });

  it("returns null for incomplete date", () => {
    expect(parseOccasionDate("2024-12")).toBeNull();
  });
});

describe("getKnownOccasionLabel", () => {
  it("returns correct label for each known kind", () => {
    expect(getKnownOccasionLabel("anniversary")).toBe("Anniversary");
    expect(getKnownOccasionLabel("christmas")).toBe("Christmas");
    expect(getKnownOccasionLabel("mothers_day")).toBe("Mother's Day");
    expect(getKnownOccasionLabel("fathers_day")).toBe("Father's Day");
    expect(getKnownOccasionLabel("valentines")).toBe("Valentine's Day");
    expect(getKnownOccasionLabel("easter")).toBe("Easter");
    expect(getKnownOccasionLabel("custom")).toBe("Custom");
  });

  it("returns the kind itself for unknown kinds", () => {
    expect(getKnownOccasionLabel("unknown_event")).toBe("unknown_event");
  });
});

describe("getKnownOccasionDate", () => {
  it("returns Christmas on Dec 25 for the current or next year", () => {
    const today = new Date(2024, 0, 1); // Jan 1 2024
    const result = getKnownOccasionDate("christmas", today);
    expect(result).toBe("2024-12-25");
  });

  it("rolls Christmas to next year when Dec 25 has passed", () => {
    const today = new Date(2024, 11, 26); // Dec 26 2024
    const result = getKnownOccasionDate("christmas", today);
    expect(result).toBe("2025-12-25");
  });

  it("returns Valentine's Day on Feb 14", () => {
    const today = new Date(2024, 0, 1);
    const result = getKnownOccasionDate("valentines", today);
    expect(result).toBe("2024-02-14");
  });

  it("returns correct Easter date for 2024 (March 31)", () => {
    const today = new Date(2024, 0, 1);
    const result = getKnownOccasionDate("easter", today);
    expect(result).toBe("2024-03-31");
  });

  it("returns correct Easter date for 2025 (April 20)", () => {
    const today = new Date(2025, 0, 1);
    const result = getKnownOccasionDate("easter", today);
    expect(result).toBe("2025-04-20");
  });

  it("returns correct Easter date for 2026 (April 5)", () => {
    const today = new Date(2026, 0, 1);
    const result = getKnownOccasionDate("easter", today);
    expect(result).toBe("2026-04-05");
  });

  it("returns null for unknown kind", () => {
    expect(getKnownOccasionDate("unknown", new Date(2024, 0, 1))).toBeNull();
  });
});

describe("nextOccurrenceDate", () => {
  it("returns future fixed date when in the future", () => {
    const today = new Date(2024, 0, 1);
    const result = nextOccurrenceDate("2024-06-15", true, today);
    expect(result).toEqual(new Date(2024, 5, 15));
  });

  it("rolls yearly recurring date to next year when past", () => {
    const today = new Date(2024, 6, 1); // Jul 1
    const result = nextOccurrenceDate("2024-06-15", true, today);
    expect(result).toEqual(new Date(2025, 5, 15));
  });

  it("returns null for non-recurring date that has passed", () => {
    const today = new Date(2024, 6, 1);
    const result = nextOccurrenceDate("2024-06-15", false, today);
    expect(result).toBeNull();
  });

  it("returns the date for non-recurring event in the future", () => {
    const today = new Date(2024, 0, 1);
    const result = nextOccurrenceDate("2024-06-15", false, today);
    expect(result).toEqual(new Date(2024, 5, 15));
  });

  it("returns null for null date with no kind", () => {
    expect(nextOccurrenceDate(null, true, new Date())).toBeNull();
  });

  it("resolves null date from kind", () => {
    const today = new Date(2024, 0, 1);
    const result = nextOccurrenceDate(null, true, today, "christmas");
    expect(result).toEqual(new Date(2024, 11, 25));
  });
});

describe("daysUntilOccasion", () => {
  it("returns 0 when occasion is today", () => {
    const today = new Date(2024, 5, 15);
    expect(daysUntilOccasion("2024-06-15", true, today)).toBe(0);
  });

  it("returns 1 when occasion is tomorrow", () => {
    const today = new Date(2024, 5, 14);
    expect(daysUntilOccasion("2024-06-15", true, today)).toBe(1);
  });

  it("returns null for past non-recurring date", () => {
    const today = new Date(2024, 6, 1);
    expect(daysUntilOccasion("2024-06-15", false, today)).toBeNull();
  });

  it("resolves days from kind when date is null", () => {
    const today = new Date(2024, 11, 24); // Dec 24
    const days = daysUntilOccasion(null, true, today, "christmas");
    expect(days).toBe(1);
  });
});

describe("formatOccasionDate", () => {
  it("formats with year by default", () => {
    const result = formatOccasionDate("2024-05-15");
    expect(result).toContain("2024");
    expect(result).toContain("May");
    expect(result).toContain("15");
  });

  it("formats without year when includeYear is false", () => {
    const result = formatOccasionDate("2024-05-15", false);
    expect(result).not.toContain("2024");
    expect(result).toContain("May");
  });

  it("returns empty string for null with no kind", () => {
    expect(formatOccasionDate(null)).toBe("");
  });

  it("resolves null date from kind", () => {
    const result = formatOccasionDate(null, false, "christmas");
    expect(result).toContain("25");
    expect(result).toContain("December");
  });
});
