# Changelog

Every significant change to this project is recorded here. **AI agents must add an entry before committing.** The git log has commit hashes and diffs; this file captures the *why* and the design decisions behind each change.

## Entry format

```
## [YYYY-MM-DD] Title
**By:** human | Claude Code | Gemini CLI | Cursor | etc.
**What:** Short description of what changed (files, features, behaviour).
**Why:** The reason — constraint, bug, user request, performance, correctness, etc.
```

---

## [2026-05-03] Logo layout tweaks + remove gradient background
**By:** Claude Code
**What:** Removed rose-to-amber gradient from body — replaced with plain `bg-white dark:bg-neutral-950`. Nav now uses `text.png` (text-only logo, larger) on sm+ instead of `full.png`. Login page now shows `icon.png` only (96×96) instead of the full logo. Stripped background from `text.png`.
**Why:** User preferred plain background over the gradient. Login page looks cleaner with just the icon. Nav text logo is cleaner than the combined mark.

## [2026-05-03] Logo polish: transparent backgrounds, Next.js Image, favicon fix
**By:** Claude Code
**What:** Removed off-white backgrounds from `public/logo/full.png`, `public/logo/icon.png`, and `public/favicon.png` (sampled corner pixel R253 G255 B253 and flood-filled to transparent). Replaced bare `<img>` tags in `components/nav.tsx` and `app/login/page.tsx` with Next.js `<Image>` (priority loading, proper width/height). Nav now shows icon-only on mobile, full logo on sm+. Added `app/icon.png` so Next.js App Router auto-generates the favicon `<link>` tag. Added `icons` to layout metadata as a fallback. Removed the unused `CakeIcon` component from nav.
**Why:** Logo backgrounds looked wrong against the app background. `<img>` tags bypass Next.js image optimisation. The favicon was not showing because App Router requires the file in `app/`, not `public/`.

## [2026-05-01] App rebrand: Birthday Gift Finder → Noted
**By:** Gemini CLI (dbwg2009 commit 295c7a6)
**What:** Updated app name throughout: metadata, nav, login page, iCal PRODID (`-//Noted//...`), email templates, `package.json` name/version, OpenRouter `X-Title` header. Added logo and favicon assets under `public/logo/` and `Logo/`. Removed legacy logo assets.
**Why:** User requested rebrand. "Noted" is shorter and better captures the note-taking/tracking nature of the app.

## [2026-05-01] Phase 5: iCal feed, photo uploads, search tweaks
**By:** Gemini CLI (dbwg2009 commit 98c19b7)
**What:**
- iCal feed: new route `app/api/ical/[token]/route.ts`, generator at `lib/ical.ts`, `ical_token` UUID column on `users` table, `getIcalUrl` helper, `resetIcalToken` server action, dashboard UI showing the URL and a reset button.
- Photo uploads: `lib/storage.ts` with `local` (default) and `base64` strategies. `createPerson`/`updatePerson` server actions accept `photoFile`, forms use `encType="multipart/form-data"`.
- Calendar grid: added `overflow-x-auto` + min-width for horizontal scroll on narrow screens.
- Product search: eBay results per page 8 → 4; OpenRouter prompt tightened to return exactly 3–4 items and avoid hallucinated deep links; previous AI-search candidates cleared before inserting new ones.
**Why:** Phase 5 scope items. iCal feed allows subscribing in any calendar app without auth. Photo uploads replace URL-only entry. Search tightening reduces hallucinated URLs in AI results.

## [2026-05-01] Docker publish workflow + README rebrand
**By:** dbwg2009 (commit 5d33042)
**What:** CI workflow now pushes Docker Hub repository description (via `peter-evans/dockerhub-description`). README rebranded to Noted, expanded feature list, simplified quick-start to use pre-built Docker Hub images.
**Why:** Improve discoverability and ease of deployment from Docker Hub.

## [2026-04-xx] Phase 4: email reminder digests + daily cron
**By:** Claude Code (commit 056bd78)
**What:** `lib/reminders.ts` with `findDueReminders`, `buildShortlist`, `runDailyReminders`, `ensureDefaultReminders`, `sendReminderForPersonNow`. `lib/notify/email.ts` renders HTML+text digest. `/api/cron/reminders` route protected by `CRON_SECRET`. `cron` Docker Compose sidecar hits the endpoint every `CRON_INTERVAL_SECONDS`. Per-person "Send test now" button. `reminders` table with `last_sent_for_year` for idempotency. Default lead times: 30/14/7/1 days.
**Why:** Phase 4 — automated birthday reminders with budget-aware shortlist so the user gets a curated email before each birthday.

## [2026-04-xx] Phase 3: gift suggestions + gift history
**By:** Claude Code (commit 2961582)
**What:** `suggestions` table. `lib/suggestions.ts` calls OpenRouter with full person context. Promote suggestion → wishlist item or dismiss. `gift_history` table. "Mark as given" on wishlist item auto-creates history entry. Standalone history form for retroactive entries. Reaction notes field.
**Why:** Phase 3 — AI-powered suggestions based on full context, and history tracking to avoid repeating gifts and inform future suggestions.

## [2026-04-xx] Switch to OpenRouter; multi-page UI redesign
**By:** Claude Code (commit 93d8826)
**What:** Replaced Gemini/direct OpenAI calls with OpenRouter via plain `fetch`. Added eBay Browse API fallback. Multi-page layout: `/` dashboard, `/calendar` month grid, `/people` card grid, `/people/new`, `/people/[id]`. Shared `Nav`, `Avatar`, `StatusPill`, `CountdownBadge` components.
**Why:** User preferred OpenRouter (one API key, many free models). Lost Gemini's Google Search grounding — eBay fallback mitigates hallucinated URLs. Multi-page layout needed as app grew beyond a single people-list page.

## [2026-04-xx] Phase 2: AI product lookup
**By:** Claude Code (commit post-Phase 1)
**What:** `lib/products/openrouter.ts` (LLM product search), `lib/products/ebay.ts` (Browse API fallback), `lib/products/search.ts` (orchestrator with rate-limit detection), `lib/products/types.ts`. `findProductsForWishlistItem` server action. `products` table. Save/delete products from wishlist item detail. AI badge on saved AI-sourced products.
**Why:** Phase 2 — the core AI feature: find real products with prices and buy links for wishlist items.

## [2026-04-xx] Phase 1: people & wishlists
**By:** Claude Code
**What:** `people`, `tags`, `person_tags`, `wishlist_items` tables. Full CRUD for people (name, birthday, relationship, notes, budget, sizes, avoid, tags). Wishlist CRUD with status workflow (`idea → researching → chosen → purchased → given`), source notes, heard-on date.
**Why:** Phase 1 — the foundational data layer everything else builds on.

## [2026-04-xx] Phase 0: scaffold
**By:** Claude Code (commit df7fa0d)
**What:** Next.js 15 App Router, TypeScript strict, Tailwind v3, Drizzle ORM, Auth.js v5 (Resend magic-link, `ALLOWED_EMAIL` gate), Postgres via `postgres-js`, Docker Compose stack (db + migrate one-shot + app), `.env.example`.
**Why:** Project bootstrap. All locked decisions (single-user, OpenRouter, Resend, GBP, Docker) were established here and recorded in `docs/DECISIONS.md`.
