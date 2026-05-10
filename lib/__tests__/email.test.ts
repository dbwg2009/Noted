import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { fromAddress, renderDigestText, renderDigestHtml } from "../notify/email";
import type { DigestUserBlock } from "../reminders";

const baseDigest: DigestUserBlock = {
  userId: "u1",
  userEmail: "user@example.com",
  blocks: [
    {
      personId: "p1",
      personName: "Alice",
      relationship: "friend",
      targetDate: "2026-06-01",
      leadDays: 7,
      shortlist: [],
    },
  ],
};

const shortlistDigest: DigestUserBlock = {
  ...baseDigest,
  blocks: [
    {
      ...baseDigest.blocks[0],
      shortlist: [
        {
          kind: "product",
          title: "Fancy Mug",
          retailer: "Amazon",
          url: "https://amazon.co.uk/fancy-mug",
          pricePence: 1299,
          rationale: null,
        },
        {
          kind: "suggestion",
          title: "Spa Day Voucher",
          retailer: null,
          url: null,
          pricePence: null,
          rationale: null,
        },
      ],
    },
  ],
};

describe("fromAddress", () => {
  beforeEach(() => {
    vi.stubEnv("EMAIL_FROM_REMINDERS", "");
    vi.stubEnv("EMAIL_FROM", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns the specific env var when set", () => {
    vi.stubEnv("EMAIL_FROM_REMINDERS", "Noted Reminders <reminders@noted.example>");
    expect(fromAddress("EMAIL_FROM_REMINDERS")).toBe("Noted Reminders <reminders@noted.example>");
  });

  it("falls back to EMAIL_FROM when specific key is unset", () => {
    vi.stubEnv("EMAIL_FROM", "Noted <hello@noted.example>");
    expect(fromAddress("EMAIL_FROM_REMINDERS")).toBe("Noted <hello@noted.example>");
  });

  it("falls back to hardcoded default when both are unset", () => {
    expect(fromAddress("EMAIL_FROM_REMINDERS")).toBe("Noted <onboarding@resend.dev>");
  });

  it("strips surrounding double quotes left by some Docker Compose versions", () => {
    vi.stubEnv("EMAIL_FROM_AUTH", '"Noted Support <help@noted.example>"');
    expect(fromAddress("EMAIL_FROM_AUTH")).toBe("Noted Support <help@noted.example>");
  });

  it("strips surrounding single quotes", () => {
    vi.stubEnv("EMAIL_FROM_AUTH", "'Noted Support <help@noted.example>'");
    expect(fromAddress("EMAIL_FROM_AUTH")).toBe("Noted Support <help@noted.example>");
  });

  it("does not strip inner quotes", () => {
    vi.stubEnv("EMAIL_FROM_AUTH", "Noted Support <help@noted.example>");
    expect(fromAddress("EMAIL_FROM_AUTH")).toBe("Noted Support <help@noted.example>");
  });
});

describe("renderDigestText — no promotional content", () => {
  it("does not include prices in the shortlist", () => {
    const text = renderDigestText(shortlistDigest, "https://noted.example");
    expect(text).not.toMatch(/£/);
    expect(text).not.toMatch(/\d+\.\d{2}/);
    expect(text).not.toMatch(/est\./);
  });

  it("does not include external URLs in the shortlist", () => {
    const text = renderDigestText(shortlistDigest, "https://noted.example");
    expect(text).not.toContain("https://amazon.co.uk");
  });

  it("includes item titles", () => {
    const text = renderDigestText(shortlistDigest, "https://noted.example");
    expect(text).toContain("Fancy Mug");
    expect(text).toContain("Spa Day Voucher");
  });

  it("includes a link to the person page", () => {
    const text = renderDigestText(shortlistDigest, "https://noted.example");
    expect(text).toContain("https://noted.example/people/p1");
  });
});

describe("renderDigestHtml — no promotional content", () => {
  it("does not include prices in the shortlist section", () => {
    const html = renderDigestHtml(shortlistDigest, "https://noted.example");
    expect(html).not.toMatch(/£/);
    expect(html).not.toMatch(/est\./);
  });

  it("does not include external buy links in the shortlist section", () => {
    const html = renderDigestHtml(shortlistDigest, "https://noted.example");
    expect(html).not.toContain("https://amazon.co.uk");
  });

  it("includes item titles", () => {
    const html = renderDigestHtml(shortlistDigest, "https://noted.example");
    expect(html).toContain("Fancy Mug");
    expect(html).toContain("Spa Day Voucher");
  });

  it("includes retailer name in text form", () => {
    const html = renderDigestHtml(shortlistDigest, "https://noted.example");
    expect(html).toContain("Amazon");
  });

  it("includes a link to the person page", () => {
    const html = renderDigestHtml(shortlistDigest, "https://noted.example");
    expect(html).toContain("https://noted.example/people/p1");
  });

  it("renders an empty shortlist message when no items", () => {
    const html = renderDigestHtml(baseDigest, "https://noted.example");
    expect(html).toContain("No shortlist yet");
  });
});
