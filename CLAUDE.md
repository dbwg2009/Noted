# Onboarding for AI agents

Read this first. It exists so any AI session (Claude Code, Cursor, etc.) can pick up where the previous one left off without re-deriving the project.

---

## What this project is

A personal, single-user web app for tracking friends' and family birthdays, capturing gift ideas, using AI to find real products with prices + buy links, and emailing the owner reminders ahead of each birthday.

Owner / sole user: **dbwg2009**.

## Where to find things

- **`docs/DESIGN.md`** — full design: goals, features, data model, architecture, build phases, repo layout. **Read this before changing anything non-trivial.**
- **`docs/DECISIONS.md`** — locked decisions and a change log (single-user, email reminders, UK/GBP, OpenRouter LLM, Docker primary). Update this when a decision changes; do not silently override.
- **`CHANGELOG.md`** — running log of every significant change: what changed, why, and when. **All AI agents must update this on every commit.** See the file for the entry format.
- **`README.md`** — quick-start (Docker + native Node).
- **`db/schema.ts`** — the source of truth for the DB shape.
- **`lib/auth.ts`** — Auth.js v5 config (Resend magic-link, single-user gate via `ALLOWED_EMAIL`).
- **`Dockerfile`** + **`docker-compose.yml`** — primary deployment target is Docker on a Pi.

## Locked decisions (do not silently change)

| Area | Decision |
|------|----------|
| Mode | Single-user (auth scaffolded for future multi) |
| LLM | **OpenRouter** via OpenAI-compatible REST. Default model `meta-llama/llama-3.3-70b-instruct:free`, overridable via `OPENROUTER_MODEL`. **Not** Claude, OpenAI direct, or Gemini. |
| Product search | OpenRouter LLM (primary, generates product candidates) + eBay Browse API (fallback for real listings). **No SerpAPI, no scraping.** Caveat: without web grounding, LLM-generated URLs may be hallucinated; eBay fallback exists for that reason. |
| Reminders | Email via Resend |
| DB | Postgres via `postgres-js` driver (works for both Docker Postgres and Neon) |
| Currency | GBP, locale `en-GB`, timezone `Europe/London` |
| Hosting | Docker Compose primary; Vercel + Neon as alt |
| Affiliate links | None — keep links clean |
| Encryption-at-rest | Trust DB provider; no app-layer encryption |

If a decision genuinely needs to change, update `docs/DECISIONS.md` in the same commit.

## Build phases

| Phase | Status | Scope |
|-------|--------|-------|
| 0 — Scaffold | **done** | Next.js + Tailwind + Drizzle + Auth.js + Docker stack |
| 1 — People & wishlists | **done** | CRUD for people, tags, wishlist items with status workflow + source notes |
| 2 — AI product lookup | **done** | OpenRouter (LLM) primary, eBay Browse API fallback, manual entry |
| 2.5 — UI polish | **done** | Multi-page layout: dashboard `/`, calendar `/calendar`, people `/people` (cards) → `/people/new` and `/people/[id]`. Shared nav, avatars, status pills, countdown badges |
| 3 — Suggestions & history | **done** | "Suggest gifts" via OpenRouter with full person context (wishlist + tags + notes + history + budget). `suggestions` table. Promote suggestion → wishlist item, or dismiss. Gift history with reaction notes; "Mark as given" on wishlist items auto-creates history entry; standalone history form for retroactive entries |
| 4 — Reminders | **done** | Default 30/14/7/1-day reminders auto-created per person. Daily digest email via Resend with budget-aware shortlist (products + suggestions). `/api/cron/reminders` endpoint protected by `CRON_SECRET`; `cron` sidecar in compose pings it on `CRON_INTERVAL_SECONDS` (default 86400). Per-person "Send test now" button. |
| 5 — Polish | **done** | Photo uploads (`lib/storage.ts`, local filesystem or base64), iCal feed (`/api/ical/[token]`, `users.ical_token`), mobile tweaks (horizontal scroll on calendar) |

When starting work, find the next pending task in this list. **Don't skip phases** without explicit user approval — Phase 1 lays the data flow Phase 2+ build on.

## Tech stack quick reference

- Next.js 15, App Router, server actions, **standalone output**.
- TypeScript strict.
- Drizzle ORM. Schema in `db/schema.ts`. Run migrations with `npm run db:push` (or via the `migrate` service in compose).
- Auth.js v5 (`next-auth@5.0.0-beta.x`) with Resend provider + Drizzle adapter. DB sessions, not JWT.
- Tailwind v3 (no UI library yet — bespoke components in `components/`).
- **OpenRouter** via plain `fetch` to `/api/v1/chat/completions` (no SDK dependency). Default model `meta-llama/llama-3.3-70b-instruct:free`.
- `resend` for outbound mail.

## Local dev

Two ways. Prefer Docker for parity with how the user actually runs it (Raspberry Pi).

### Docker
```bash
cp .env.example .env   # leave DATABASE_URL blank; compose sets it
docker compose up --build -d
# migrate service applies schema before app starts; just open http://localhost:3000
```

### Native
```bash
cp .env.example .env.local   # fill DATABASE_URL etc.
npm install
npm run db:push
npm run dev
```

## Conventions

- **Money** stored as integer **smallest unit** (pence) in the DB. Format on render.
- **Dates** stored as ISO `yyyy-mm-dd` (`date` column). For birthdays, `birth_year_known: false` means the year is a placeholder.
- **All DB writes** go through Drizzle. No raw SQL unless absolutely necessary.
- **Server actions** for mutations. Avoid REST routes except for `/api/auth/*` and cron.
- **Imports** use the `@/*` alias (configured in `tsconfig.json`).
- **No comments unless the WHY is non-obvious.** Code should be self-documenting.

## What NOT to do

- Don't switch the LLM provider away from OpenRouter without updating `DECISIONS.md`. If a different provider is genuinely needed, OpenRouter is preferred because it gives access to many free models behind one API.
- Don't add SerpAPI or any scraping — it was explicitly rejected for cost/ToS reasons.
- Don't introduce a JWT session strategy; we're on DB sessions because the magic-link flow needs `verification_tokens`.
- Don't bypass `ALLOWED_EMAIL` — it's the only thing keeping randoms out.
- Don't build features beyond the current phase without asking the user. The build order matters because each phase depends on the previous data shape.
- Don't commit `.env` or any secrets.
- Don't rewrite working code "for cleanliness" — small surface area, personal app, ship it.
- Don't add a UI component library (e.g. shadcn) without asking — we're keeping deps minimal.

## Picking up the work

1. Read `docs/DESIGN.md` and `docs/DECISIONS.md`.
2. Check the build phase table above; the first **pending** phase is your next job.
3. Small, focused commits with descriptive messages. Match existing commit style (imperative subject + short body explaining the why).
4. **Before committing:** add an entry to `CHANGELOG.md` describing what you changed and why. Use the format in that file.
5. After work, push the branch and confirm with the user before opening a PR / merging to main.
6. Update this file or `docs/DECISIONS.md` if the decisions change.

## Known gotchas

- The runner Docker stage is a Next.js **standalone** image — it does NOT have `drizzle-kit` or devDeps. Migrations run via the separate `migrate` service in compose, which uses the `migrator` target from the same Dockerfile.
- The `postgres-js` driver pool defaults are tuned for the Docker Postgres; if Neon is used, may need `ssl: "require"` query param in `DATABASE_URL`.
- Auth.js v5 is in beta; the API may shift between minor versions. Pin the version in `package.json`.
- Resend's magic-link emails work fine pointing at `localhost:3000` for dev — the link is just a URL the user clicks.
- OpenRouter free models are aggressively rate-limited (a few requests per minute). Two distinct sources of 429: (1) per-account daily/minute caps, and (2) **upstream provider rate limits** that affect all OpenRouter users at once (e.g. Google AI Studio for Gemma free models). Upstream limits show up as `Provider returned error` in the body. Fix: switch model via `OPENROUTER_MODEL`, or BYOK at https://openrouter.ai/settings/integrations. The `searchProducts()` orchestrator detects rate-limit-shaped errors and falls through to eBay automatically.
- Reminder cron: `cron` sidecar runs `curl http://app:3000/api/cron/reminders` every `CRON_INTERVAL_SECONDS` (default 86400). The route requires `Authorization: Bearer $CRON_SECRET`. `runDailyReminders()` is idempotent — `last_sent_for_year` ensures the same reminder won't fire twice per cycle, so manual triggering during dev is safe.
- LLM-generated product URLs are NOT verified — the model can hallucinate. The eBay fallback is the only path for guaranteed-real URLs. UI labels saved products with their `source` (`AI` vs `Manual`) so the user knows.
- `app/people/page.tsx` is the **list page only**; person detail is `app/people/[id]/page.tsx`. Wishlist + product UI lives in the detail page. Server actions are still in `app/people/actions.ts` and shared between both.
- `lib/people-queries.ts` holds the read queries (`listPeopleSummary`, `getPersonDetail`). Server actions in `app/people/actions.ts` only do writes; don't move them around without updating both pages.
- Photo uploads use `lib/storage.ts`. Default strategy is `local` (writes to `public/uploads/`, needs a Docker volume for persistence). Set `STORAGE_STRATEGY=base64` for serverless/Vercel deployments (stores the file as a `data:` URI in `photo_url`).
- The iCal feed is at `/api/ical/[token]`. The token is `users.ical_token` (a UUID). Resetting it invalidates old calendar subscriptions. Token must be non-null for the feed route to work — it is auto-generated on account creation via `defaultRandom()`.

## When something is unclear

Ask the user. Don't guess on locked decisions, schema changes, or anything affecting cost (AI calls, paid APIs).
