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

## [2026-05-05] DOB refactor, occasion autofill, and Docker standalone fixes
**By:** Gemini CLI
**What:**
- Refactored birthday/DOB input to use separate Day/Month/Year fields, making Year truly optional and removing native date picker constraints.
- Fixed occasion autofill logic to correctly populate date and name for holidays.
- Updated `Dockerfile` to correctly handle `public` and `static` assets in standalone mode, fixing 404s for uploaded photos.
**Why:** User reported DOB still required a year, occasions didn't autofill correctly, and photos were 404ing.

## [2026-05-05] Phase 6 & Bug Fixes
**By:** Gemini CLI
**What:**
- Completed **Phase 6: Other Occasions**: Christmas, Anniversary, Mother's/Father's Day, and Custom occasions with per-occasion reminders.
- Fixed photo upload bug by adding missing `revalidatePath` and correcting Docker directory permissions/ownership.
- Defaulted "Birth year known" to false in new person form to allow year-less DOB entry by default.
- Ensured all person-related actions (wishlist, products, suggestions, history) revalidate the detail page correctly.
- Enabled custom date entry for Anniversary occasions.
**Why:** User reported upload issues and desire for year-less DOB and custom anniversary dates. Phase 6 implementation was incomplete.

## [2026-05-04] Docker: Pi build optimisations
**By:** GitHub Copilot
**What:**
- Optimised `Dockerfile` to split production and development dependency stages, use `npm ci` for deterministic installs, and leverage BuildKit cache mounts to speed repeated installs on low-powered devices (Raspberry Pi).
- Added a `deps-prod` stage so the runtime image only contains prod dependencies, reducing image size and memory footprint.
- Migrator stage keeps devDeps (drizzle-kit) separate so migrations still run in CI/dev without bloating the runtime image.
- Updated `docker-compose.yml` with commented `platform` hints to help Pi users set `PLATFORM=linux/arm64` or `linux/arm/v7` when building on ARM.
**Why:**
- Building on Raspberry Pi can be slow and memory-constrained; separating deps, using `npm ci`, and enabling BuildKit cache significantly reduces build time and runtime image size while keeping migrations functional.


## [2026-05-04] Phase 6: Other Occasions (schema, reminders, UI)
**By:** GitHub Copilot
**What:**
- Added `occasion_kind` enum and `occasions` table to `db/schema.ts` with indexes and a nullable `occasion_id` FK on `reminders`.
- Extended `lib/reminders.ts` to detect and send reminders for occasion rows, and to create default reminders for person-linked occasions.
- Added `lib/occasions.ts` helper functions (`nextOccurrenceDate`, `daysUntilOccasion`, `formatOccasionDate`).
- Implemented `lib/occasions-queries.ts` (`listUpcomingOccasions`, `getOccasionsForPerson`).
- Added server actions in `app/people/occasion-actions.ts` for creating, updating, and deleting occasions.
- Updated UI: dashboard (`app/page.tsx`), calendar (`app/calendar/page.tsx`), and person detail (`app/people/[id]/page.tsx`) to surface occasions and provide add/edit/delete forms.
**Why:**
Extend the app beyond birthdays so users can track anniversaries, Christmas, and custom occasions; wire reminders into the existing reminder/email shortlist system so occasion-based reminders behave like birthday reminders.


## [2026-05-04] V2 roadmap: design doc, CLAUDE.md + DESIGN.md updates, GitHub milestones
**By:** Claude Code
**What:**
- Created `docs/V2_DESIGN.md` — full V2 spec covering Phases 6–10 (Other Occasions, Shareable Wishlists, Group Gifts, Price-Drop Alerts, Browser Extension). Each phase has schema deltas, new routes/actions, key files to create/modify, and step-by-step implementation notes for any AI agent to follow.
- Updated `CLAUDE.md`: added V2 reference to the "Where to find things" section and split the build-phase table into V1 (complete) and V2 (pending) sections.
- Updated `docs/DESIGN.md` Section 3 (Stretch/v2): replaced bullet list with a structured V2 phase table pointing to the new spec.
- Created five GitHub milestones (one per V2 phase) with descriptions.
**Why:** V1 is shipped at v1.1.0. This commit establishes the V2 roadmap so any future AI agent (or the owner) can pick up from Phase 6 without re-deriving the plan.

## [2026-05-04] Performance optimisations: indexes, connection pool, caching, reminders
**By:** Claude Code
**What:**
- `db/schema.ts`: added explicit indexes on every FK column (`people.userId`, `tags.userId`, `sessions.userId`, `accounts.userId`, `wishlistItems.personId`, `products.personId`, `products.wishlistItemId`, `giftHistory.personId`, `suggestions.personId`, `reminders.personId`, `aiRequestLog.userId`). PostgreSQL does not auto-index foreign keys.
- `db/index.ts`: raised `idle_timeout` from 20 s to 600 s to stop the connection pool from thrashing on a low-traffic Pi.
- `lib/people-queries.ts`: wrapped `requireCurrentUserId` in `React.cache()` so repeated calls within the same request (server components + actions) are deduplicated — eliminates redundant `auth()` + user-lookup DB hits.
- `lib/reminders.ts`: `findDueReminders` now filters entirely in SQL (birthday month/day vs. `today + lead_days`, `lastSentForYear` exclusion) instead of loading all reminders and filtering in JS. Reminder `lastSentForYear` updates are now batched with `inArray` per target year instead of one `UPDATE` per row.
- `app/api/ical/[token]/route.ts`: changed `Cache-Control` from `no-store` to `private, max-age=3600, stale-while-revalidate=86400` — calendar clients can cache the feed for an hour rather than recomputing on every poll.
- `docker-compose.yml`: added `deploy.resources.limits` — `memory: 512M` for app, `memory: 64M` for cron — to prevent OOM kills on the Pi.
**Why:** User requested a full efficiency pass. Biggest gains are the missing DB indexes (table scans on every request) and the cron full-table scan. All changes are safe and backwards-compatible; no schema data migrations needed — `db:push` will add the indexes.

## [2026-05-03] Password auth + multi-user
**By:** GitHub Copilot
**What:** Replaced email magic-link auth with password-based credentials (bcrypt hashed) and enabled multi-user support. Added `password_hash` column to the `users` table, a registration API at `app/api/auth/register/route.ts`, and updated `lib/auth.ts` to use the Credentials provider. Updated the login and register UI.
**Why:** User requested switching to password-based authentication and multi-user capability.

## [2026-05-03] Forgot-password + settings
**By:** GitHub Copilot
**What:** Added a forgot-password flow: `POST /api/auth/forgot` to create time-limited reset tokens and email a reset link (Resend), `POST /api/auth/reset` to apply the new password. Added UI pages `/login/forgot` and `/login/reset`. Added a `/settings` page with profile editing, password change, and iCal token reset (`app/settings/*`).
**Why:** User requested password reset and a per-user settings page after switching to password auth.


## [2026-05-03] Brand blue nav bar + light blue page background
**By:** Claude Code
**What:** Nav bar changed from white to brand-blue-600 with white text, white/10 hover states, and semi-transparent sign-out border. Icon logo used in nav (dark text logo not readable on blue). Body background changed from pure white to brand-blue-50 (very light periwinkle).
**Why:** The whole page looked plain white with no colour identity. The blue nav is the primary colour anchor.

## [2026-05-03] Brand colour scheme
**By:** Claude Code
**What:** Added `brand.blue` and `brand.teal` palettes to `tailwind.config.ts` derived from the logo colours. Defined `.btn-primary` and `.btn-secondary` utilities in `globals.css`. Replaced all `bg-neutral-900 text-white` primary buttons across every page with `btn-primary`. Avatar fallback gradient changed from rose/amber to brand blue/teal. TagChip and StatusPill `researching` state use brand teal/blue. Reminder channel badge, product links, and AI action buttons all updated to brand colours. Logo added to README.
**Why:** App was styled entirely in neutrals with no colour identity. The brand palette ties the UI to the logo's blue-and-teal aesthetic.

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
