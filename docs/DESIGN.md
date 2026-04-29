# Design Plan — Birthday Gift Finder

This document describes the proposed architecture, features, data model, and tech stack. Anything tagged **[DECIDE]** needs your input — see `QUESTIONS.md` for the consolidated list.

---

## 1. Goals

A web app, used primarily by you (the owner), to:

1. Store people you care about and their birthdays.
2. Capture the things they've mentioned wanting.
3. Use AI + product search APIs to find real products (price + buy link) for those wishlist items.
4. Suggest additional gift ideas based on the wishlist, interests, and budget.
5. Remind you ahead of each birthday with a shortlist tailored to your budget.

Non-goals (for v1):
- Multi-user collaboration / shared wishlists between users.
- Actually purchasing items (we surface links only).
- Mobile native app (web-responsive is fine).

---

## 2. Core Features (v1)

### 2.1 People management
- Add / edit / delete a person.
- Fields: name, birthday (date, year optional), relationship (friend / family / partner / coworker / other), default gift budget (min / max), notes, photo (optional), clothing sizes, allergies / things to avoid.
- Tags (e.g. "gamer", "reader", "outdoorsy") to feed into AI suggestions.

### 2.2 Wishlist per person
- List of items they've said they want. Each item has:
  - Free-text description (what they said, in your words)
  - Optional date heard / source ("said at dinner 2026-03-12")
  - Status: `idea` → `researching` → `chosen` → `purchased` → `given`
  - Estimated budget category (cheap / mid / splurge) or specific price range
  - Linked products (zero or more — see 2.3)

### 2.3 Product lookup (the AI part)
For any wishlist item, you can hit "Find products". The system:
1. Sends the free-text description + person context (budget, sizes, region) to an LLM.
2. LLM produces a normalized search query and category guesses.
3. Calls a product search API (see §5) to fetch real listings.
4. Returns a ranked list with: title, price, currency, image, retailer, buy URL, in-stock flag.
5. You can save any result to the wishlist item, edit fields, or add a fully manual entry.

**Manual entry path**: every AI step is optional. You can always paste a URL or fill fields by hand.

### 2.4 AI gift suggestions
For a person, "Suggest gifts" uses the LLM with the full context (wishlist + tags + notes + past gifts + budget) to propose new gift ideas not already in the wishlist. Each suggestion can be promoted into a wishlist item and then sent through the product lookup flow.

### 2.5 Reminders
- Configurable lead times (default: 30 / 14 / 7 / 1 days before).
- Reminder includes a budget-aware shortlist (top N products / suggestions within the person's set budget).
- Channel: **[DECIDE]** email, web push, SMS, Telegram, or just in-app?

### 2.6 Gift history
- Every gift you mark as `given` is recorded with date, price paid, recipient reaction notes.
- Used to avoid duplicate suggestions and to inform future AI suggestions ("they loved last year's photography book").

---

## 3. Stretch / v2 ideas (not committed)

- Other occasions: anniversaries, Christmas, Mother's/Father's Day.
- Group gifts: split a gift across multiple people (you + siblings buy mom one thing).
- Calendar integration (iCal export / Google Calendar sync).
- Browser extension: right-click → "save to [person]'s wishlist".
- Price drop watching on saved products.
- Affiliate link rewriting if you ever want a tiny revenue stream.
- Family-shared mode (multiple users, with privacy boundaries).
- Recurring "gift inspiration" digest email even when no birthday is near.

---

## 4. Data Model (proposed)

```
User
  id, email, password_hash (or oauth), timezone, default_currency, created_at

Person
  id, user_id, name, birthday (date), birth_year_known (bool),
  relationship, photo_url, notes,
  budget_min, budget_max, currency,
  sizes (jsonb: {top, bottom, shoe, ring, ...}),
  avoid (text — allergies / dislikes),
  created_at, updated_at

Tag
  id, user_id, name
PersonTag
  person_id, tag_id

WishlistItem
  id, person_id, description, source_note, heard_on (date),
  status (enum), price_band (enum or {min,max}),
  created_at, updated_at

Product
  id, wishlist_item_id (nullable — can exist as standalone suggestion),
  person_id, title, description, image_url, retailer,
  url, price, currency, in_stock, source ('ai_search' | 'manual' | 'suggestion'),
  raw_payload (jsonb — original API response for debugging),
  created_at

GiftHistory
  id, person_id, product_id (nullable), title, price_paid, currency,
  given_on (date), reaction_notes

Reminder
  id, person_id, lead_days, channel, last_sent_at

AIRequestLog (for cost tracking & debugging)
  id, user_id, kind ('product_search' | 'suggestion' | 'reminder'),
  prompt_tokens, completion_tokens, cost_estimate, created_at
```

---

## 5. External services

### 5.1 LLM
- **Anthropic Claude API** (Sonnet 4.6 for most calls; Haiku for cheap classification; Opus only for hard suggestion tasks).
- Use prompt caching on the per-person context block (it's reused across product search + suggestions + reminders).

### 5.2 Product search — **[DECIDE]**
Real options, ranked by my recommendation:

1. **SerpAPI Google Shopping** — broad coverage, ~$50/mo entry tier, easy. Best default.
2. **Rainforest API (Amazon)** — clean Amazon data, pay-per-call. Good if you mostly buy from Amazon.
3. **Amazon Product Advertising API (PA-API)** — free but requires an Associates account with qualifying sales, which is a chicken-and-egg problem for a personal app.
4. **eBay Browse API** — free tier, but eBay-only.
5. **Direct scraping** — fragile, against most retailers' ToS, do not recommend.

My recommendation: start with **SerpAPI** behind an interface so we can swap providers later.

### 5.3 Reminders / notifications — **[DECIDE]**
- **Email**: Resend or Postmark (cheap, simple). Good default.
- **Web push**: free but only works when you've installed the PWA / opened recently.
- **Telegram bot**: free, reliable, and you control it. Good if you use Telegram.
- **SMS (Twilio)**: costs money per message, overkill unless you really want it.

My recommendation: email + optional Telegram.

---

## 6. Tech stack (proposed)

**[DECIDE]** — happy to swap any of this. Defaults chosen for fast solo dev + cheap hosting.

- **Frontend + backend**: Next.js 15 (App Router) with server actions. One repo, one deploy.
- **Language**: TypeScript.
- **DB**: Postgres (hosted on Neon or Supabase — both have free tiers).
- **ORM**: Drizzle.
- **Auth**: Auth.js (email magic link). Single-user mode for v1, but auth scaffolding is there from day one.
- **Styling**: Tailwind + shadcn/ui.
- **AI SDK**: `@anthropic-ai/sdk`.
- **Background jobs (reminders)**: Vercel Cron + a `/api/cron/reminders` route that runs daily.
- **Hosting**: Vercel (free tier likely enough).
- **Secrets**: `.env.local` in dev, Vercel env vars in prod.

Alternative if you prefer Python: FastAPI + HTMX + SQLite, deployed on Fly.io. Simpler but slower UI development.

---

## 7. Architecture sketch

```
┌──────────────┐    ┌────────────────────┐
│   Browser    │◀──▶│   Next.js (Vercel) │
└──────────────┘    │  - UI (React)      │
                    │  - Server actions   │
                    │  - /api/cron/...    │
                    └─────┬───────┬───────┘
                          │       │
                ┌─────────▼─┐   ┌─▼──────────────┐
                │  Postgres │   │  Claude API    │
                │  (Neon)   │   │  + SerpAPI     │
                └───────────┘   └─▼──────────────┘
                                  │
                               ┌──▼──────┐
                               │  Resend │  (reminder emails)
                               └─────────┘
```

---

## 8. AI cost guardrails

- Cache per-person context with prompt caching (huge win for reminders).
- Use Haiku for "is this query specific enough?" / categorization.
- Daily / monthly spend cap — the cron job stops if `AIRequestLog` exceeds threshold.
- Log every call with token counts so we can see what's expensive.

---

## 9. Privacy & security

- Single-user app, but treat friend data as sensitive.
- Don't send identifying friend names to product search APIs (only the item description).
- Encrypt notes & avoid fields at rest? **[DECIDE]** — adds complexity; probably overkill for v1.
- HTTPS only, secure cookies, rate-limit AI endpoints to avoid runaway cost from abuse.

---

## 10. Build phases

**Phase 0 — scaffolding** (½ day)
Next.js + Tailwind + Drizzle + auth + DB migrations + deploy to Vercel.

**Phase 1 — people & wishlists** (1–2 days)
CRUD for people, tags, wishlist items. No AI yet. Manual product entry works.

**Phase 2 — AI product lookup** (1–2 days)
Claude + SerpAPI integration. "Find products" button. Save to wishlist item.

**Phase 3 — suggestions & history** (1 day)
"Suggest gifts" flow + gift history tracking.

**Phase 4 — reminders** (1 day)
Cron job, email channel, budget-aware shortlist generation.

**Phase 5 — polish** (ongoing)
Photos, mobile layout, search, exports.

---

## 11. Repo layout (when we build)

```
/app                Next.js app router
  /(auth)           login, magic link
  /people           list, [id] detail, new
  /api/cron         reminder jobs
/components         UI components (shadcn)
/db                 Drizzle schema + migrations
/lib
  /ai               Claude client, prompts, prompt cache helpers
  /products         provider interface + SerpAPI impl
  /notify           email / channel adapters
  /reminders        scheduling logic
/docs               this folder
```

---

## 12. Things you didn't mention but should consider

(See `QUESTIONS.md` for the full list — these are the ones I think matter most.)

1. **Gift history** — knowing what you've given before is huge for avoiding repeats.
2. **Sizes & allergies** — these come up constantly when shopping.
3. **Region & currency** — product search needs to know which country you're shopping in.
4. **Other occasions** — once you build this for birthdays, you'll want it for Christmas etc. Worth designing the schema so `Occasion` can be added without a rewrite.
5. **Reminder channel** — email is the safe default; pick now so we don't half-build it.
6. **A spending cap on AI calls** — without one, a bug in a loop could cost you real money overnight.
