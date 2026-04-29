# Design Plan — Birthday Gift Finder

This document describes the architecture, features, data model, and tech stack. Decisions made together with the user are locked in (see `DECISIONS.md` for the answered questions list).

---

## 1. Goals

A web app, used by a single owner (you), to:

1. Store people you care about and their birthdays.
2. Capture the things they've mentioned wanting.
3. Use AI + web search to find real products (price + buy link) for those wishlist items.
4. Suggest additional gift ideas based on the wishlist, interests, and budget.
5. Email you ahead of each birthday with a shortlist tailored to your budget.

Non-goals (v1):
- Multi-user / shared wishlists.
- Auto-purchasing.
- Native mobile app (web responsive instead).
- Occasions other than birthdays.
- Group gifts / split-with-others.
- Browser extension.
- Affiliate link rewriting.

---

## 2. Core Features (v1)

### 2.1 People management
- Add / edit / delete a person.
- Fields: **name, birthday (date, year optional), relationship, default gift budget (min/max), notes, photo (optional, nice-to-have), clothing/shoe sizes, allergies / things to avoid, tags**.
- Tags (e.g. "gamer", "reader", "outdoorsy") feed AI suggestions.

### 2.2 Wishlist per person
- List of items they've said they want. Each item:
  - Free-text description (what they said, in your words)
  - **Source note** (where/when you heard it, e.g. "said at brunch 2026-03-12")
  - **Status**: `idea` → `researching` → `chosen` → `purchased` → `given`
  - Estimated budget band (cheap / mid / splurge) or specific price range
  - Linked products (zero or more — see 2.3)

### 2.3 Product lookup (the AI part)
For any wishlist item, "Find products" does:
1. Sends free-text description + person context (budget, sizes, region=UK, currency=GBP) to **Gemini** (Gemini 2.0 Flash).
2. Gemini uses **Google Search grounding** to search the live web.
3. Gemini extracts a normalized product list: title, price (GBP), retailer, URL, image (when available), short description.
4. Optional fallback / enrichment: **eBay Browse API** (free tier) for structured pricing on items that didn't ground cleanly.
5. You can save any result to the wishlist item, edit, or add a fully manual entry.

**Manual entry path**: every AI step is optional. You can paste a URL or fill fields by hand at any point.

### 2.4 AI gift suggestions
"Suggest gifts" uses Gemini with full context (wishlist + tags + notes + past gifts + budget + sizes + avoid list) to propose new gift ideas. Each suggestion can be promoted to a wishlist item and sent through the product lookup flow.

### 2.5 Reminders (email)
- Channel: **email** via Resend (free tier).
- Default lead times: **30, 14, 7, 1 days** before birthday.
- Each reminder includes a budget-aware shortlist (top N items / suggestions within the person's budget).
- Sent from a daily Vercel Cron job.

### 2.6 Gift history
- Marking an item `given` records: date, price paid (GBP), **reaction notes** ("loved it" / "polite smile").
- Used to avoid duplicate suggestions and to inform future AI suggestions.

---

## 3. Stretch / v2 (deferred, but schema-aware)

- **Other occasions** (Christmas, anniversary, Mother's/Father's Day) — schema designed so an `Occasion` model can be added without a migration overhaul.
- **Calendar export / Google Calendar sync** (you said you're interested) — likely v1.5: a generated iCal feed URL is cheap to add.
- **Group gifts**.
- **Browser extension** — right-click → save to wishlist.
- **Price-drop watching** on saved products.
- **Family-shared mode** (multi-user).

---

## 4. Data Model

```
User
  id, email, timezone (default Europe/London),
  default_currency (default GBP), created_at

Person
  id, user_id, name,
  birthday (date), birth_year_known (bool),
  relationship, photo_url,
  notes (text),
  budget_min, budget_max, currency (default GBP),
  sizes (jsonb: {top, bottom, shoe, ring, ...}),
  avoid (text — allergies / dislikes),
  created_at, updated_at

Tag
  id, user_id, name
PersonTag
  person_id, tag_id

WishlistItem
  id, person_id,
  description, source_note, heard_on (date),
  status (enum: idea | researching | chosen | purchased | given),
  price_band (enum) | price_min, price_max,
  created_at, updated_at

Product
  id, wishlist_item_id (nullable),
  person_id, title, description, image_url, retailer,
  url, price, currency, in_stock,
  source ('ai_search' | 'manual' | 'suggestion'),
  raw_payload (jsonb),
  created_at

GiftHistory
  id, person_id, product_id (nullable),
  title, price_paid, currency,
  given_on (date), reaction_notes

Reminder
  id, person_id, lead_days, channel ('email'),
  last_sent_at, last_sent_for_year

AIRequestLog
  id, user_id, kind ('product_search' | 'suggestion' | 'reminder_shortlist'),
  prompt_tokens, completion_tokens,
  cost_estimate, created_at
```

> **Schema note on occasions:** an `Occasion(person_id, kind, date)` table is straightforward to add later. v1 stores birthday on `Person` directly for simplicity.

---

## 5. External services

### 5.1 LLM — Google Gemini
- **Gemini 2.0 Flash** for product lookup, suggestions, and reminder shortlists.
- **Google Search grounding** enabled for product lookup (replaces paid product-search APIs).
- API key from the user's Google AI Studio account. Free tier expected to cover personal use.
- We log every call's token counts in `AIRequestLog` so cost is visible if the free tier ever runs out.

### 5.2 Product search
- **Primary:** Gemini grounded responses (returns URLs + extracted product info from live web).
- **Fallback:** **eBay Browse API** (free) for structured listings when grounding doesn't give clean prices.
- **Manual entry** always available.
- No SerpAPI, no Amazon PA-API, no scraping.

### 5.3 Reminders / email — Resend
- Free tier: 3,000 emails/month, 100/day. Way more than needed.
- A custom domain is nice but not required — Resend's `onboarding@resend.dev` works for testing.

### 5.4 Hosting
- **Vercel** free tier for the app + cron jobs.
- **Neon** free Postgres tier.

**Expected total monthly cost for v1: £0** (assuming Gemini free tier holds).

---

## 6. Tech stack

- **Framework:** Next.js 15 (App Router) with server actions.
- **Language:** TypeScript.
- **DB:** Postgres on Neon.
- **ORM:** Drizzle.
- **Auth:** Auth.js with email magic link (single-user, but scaffolding supports multi).
- **Styling:** Tailwind + shadcn/ui.
- **AI SDK:** `@google/genai`.
- **Email:** `resend` SDK.
- **Cron:** Vercel Cron → `/api/cron/reminders` daily.
- **Locale defaults:** `en-GB`, `Europe/London`, GBP.

---

## 7. Architecture

```
┌──────────────┐    ┌────────────────────┐
│   Browser    │◀──▶│   Next.js (Vercel) │
└──────────────┘    │  - UI (React)      │
                    │  - Server actions  │
                    │  - /api/cron/...   │
                    └──┬──────┬──────┬───┘
                       │      │      │
              ┌────────▼┐  ┌──▼──┐ ┌─▼────────┐
              │ Postgres│  │Gemini│ │ Resend   │
              │  (Neon) │  │  +   │ │ (email)  │
              └─────────┘  │Search│ └──────────┘
                           │ground│
                           └──────┘
                              │
                         ┌────▼─────┐
                         │ eBay API │ (fallback)
                         └──────────┘
```

---

## 8. AI cost guardrails

- Stay on Gemini's free tier; log token usage in `AIRequestLog`.
- Soft cap: warn in-app if monthly request count crosses a threshold.
- Hard cap: cron job aborts reminder generation if quota is exhausted (degrades to "no shortlist, just the reminder").
- Cache per-person context locally (we build the prompt server-side; no special caching needed at Gemini's price point).

---

## 9. Privacy & security

- HTTPS only, secure session cookies, magic-link auth (no passwords).
- Friend names omitted from product search queries (only the item description leaves our server).
- DB encryption-at-rest via Neon (no extra app-level encryption layer in v1 — trust the provider).
- Rate-limit AI endpoints to prevent runaway costs from accidental loops.

---

## 10. Build phases

| Phase | Scope | Est. |
|-------|-------|------|
| 0 | Next.js + Tailwind + Drizzle + Auth.js + Neon + Vercel deploy | ½ day |
| 1 | People CRUD, tags, sizes, notes, photos, wishlist CRUD with status workflow + source notes | 1–2 days |
| 2 | Gemini product lookup (with grounding) + eBay fallback + manual entry polish | 1–2 days |
| 3 | Suggestions + gift history with reaction notes | 1 day |
| 4 | Email reminders via Resend + Vercel Cron + budget-aware shortlist | 1 day |
| 5 | iCal feed export, mobile polish, photo uploads | ongoing |

---

## 11. Repo layout (when we build)

```
/app                Next.js app router
  /(auth)           login, magic link
  /people           list, [id] detail, new
  /api/cron         reminder jobs
  /api/ical         calendar feed (phase 5)
/components         UI components (shadcn)
/db                 Drizzle schema + migrations
/lib
  /ai               Gemini client, prompts
  /products         provider interface, gemini-grounded impl, ebay impl
  /notify           email adapter (Resend)
  /reminders        scheduling logic
/docs               this folder
```
