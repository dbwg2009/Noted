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

## [2026-05-07] Bump version to 1.3.2 — CI and Docker registry fixes
**By:** Claude Code
**What:** `package.json` version 1.3.1 → 1.3.2. Patch covers: GHCR migration (primary Docker registry now `ghcr.io/dbwg2009/noted`, Docker Hub kept as mirror), docs-only push skip, and the `[skip ci]` bug that was blocking all Actions on main.
**Why:** Two infra fixes landed on main that warranted a patch release.

---

## [2026-05-07] Fix: remove [skip ci] from sync-gemini commit message
**By:** Claude Code
**What:** Removed `[skip ci]` from the commit message written by `.github/workflows/sync-gemini.yml`. The workflow only triggers on `paths: ['CLAUDE.md']` so it cannot loop — the flag was redundant. However, GitHub treats `[skip ci]` anywhere in a squash-merge commit body as a signal to skip all Actions for that push, so every Development → main merge was silently blocking all workflows on main (including the Docker build).
**Why:** Bug: all GitHub Actions on main were being skipped after every squash merge from Development.

---

## [2026-05-07] Refresh README for public launch
**By:** Claude Code
**What:** Complete rewrite of README.md. Added dynamic badges (version, license, Next.js, Docker), three-column screenshots section (dashboard, calendar, person detail — sensitive data redacted), updated features list (now includes Phase 6 Occasions and Phase 7 Shareable Wishlists), rewritten env var table with required/optional column, self-hosting tips (Pi/ARM, uploads, reverse proxy, OpenRouter rate limits), tech stack table, roadmap (phases 8–10), and Contributing/License footer. Added `docs/screenshots/` with three redacted screenshots.
**Why:** Repo is going public. Old README was stale (referenced phases 0–5 as complete), missing two full feature phases, had no badges or screenshots, and read as a personal quick-start rather than a public project introduction.

---

## [2026-05-07] Disable auto-delete branches; add Dependabot branch cleanup workflow
**By:** Claude Code
**What:** Disabled GitHub's repo-wide "Automatically delete head branches" setting. Added `.github/workflows/cleanup-dependabot-branches.yml` — triggers on merged PRs whose head branch starts with `dependabot/` and deletes that branch via the GitHub API.
**Why:** Auto-delete was removing feature branches on merge, conflicting with the project rule that stale branches should be reviewed before deletion. Dependabot branches are safe to auto-clean; feature branches are not.

## [2026-05-07] Migrate Docker registry to GHCR; skip docs-only builds
**By:** Claude Code
**What:** Switched primary Docker registry from Docker Hub to GitHub Container Registry (GHCR). Updated `docker-compose.yml` image refs to `ghcr.io/dbwg2009/noted` and `ghcr.io/dbwg2009/noted-migrator`. Updated `.github/workflows/docker-publish.yml`: auth via `GITHUB_TOKEN` (no extra secrets), `Development` pushes go to GHCR only, `main` pushes go to both GHCR and Docker Hub simultaneously in a single build. Added `paths-ignore` so docs/changelog/memory-file-only pushes skip the workflow entirely.
**Why:** Docker Hub required stored credentials and had no easy way to skip docs-only builds. GHCR is integrated with `GITHUB_TOKEN`, reducing secret surface. Docker Hub kept as a mirror for existing users. Closes #62.

## [2026-05-07] Add ESLint config + fix pre-existing lint errors
**By:** Claude Code
**What:** Added `eslint.config.mjs` (Next.js 15 flat config format, extends `next/core-web-vitals`). Fixed pre-existing `react/no-unescaped-entities` error in `app/login/forgot/page.tsx` (unescaped apostrophe in JSX text).
**Why:** No ESLint config existed, causing `next lint` to enter interactive setup mode in CI and fail. Pre-existing error would have blocked the lint step regardless.

## [2026-05-07] Bump drizzle-orm to 0.45.2 (SQL injection security fix)
**By:** Claude Code
**What:** `drizzle-orm` bumped from `0.36.4` → `0.45.2`. `package.json` version `1.3.0` → `1.3.1`.
**Why:** 0.45.2 patches CWE-89 (SQL injection) in `sql.identifier()` and `sql.as()` — values were not properly escaped. Security fix, no API changes to application code. Build verified clean.

## [2026-05-07] Bump version to 1.3.0 — Phase 7 release
**By:** Claude Code
**What:** `package.json` version 1.2.0 → 1.3.0. Added `v1.3.0` row to the versioning table in `CLAUDE.md`. GitHub release `v1.3.0` cut.
**Why:** Phase 7 (Shareable Wishlists) is complete and merged to main; tagging a stable release point.

---

## [2026-05-07] Phase 7 — Shareable Wishlists
**By:** Claude Code
**What:** Implemented Phase 7 (Shareable Wishlists) in full.
- `db/schema.ts`: new `wishlist_shares` table — one row per person, UUID token, boolean visibility flags (`showIdea`, `showResearching`, `showChosen`, `showPrices`), optional `expiresAt`.
- `lib/share-queries.ts`: `getShareByToken`, `getWishlistShareForPerson`, `getSharePageData` (fetches share + person + filtered wishlist items + their products for the public page).
- `app/people/share-actions.ts`: `upsertWishlistShare` (create-or-update), `regenerateWishlistShare` (delete + re-insert with new UUID token), `revokeWishlistShare`.
- `components/copy-button.tsx`: minimal client component for clipboard copy with "Copied!" feedback.
- `app/share/[token]/page.tsx`: public branded read-only page. No auth required. `force-dynamic` to prevent caching. Shows person name, wishlist items, product cards with buy links. Respects `showPrices` and per-status visibility.
- `app/people/[id]/page.tsx`: new "Share wishlist" section between Reminders and Settings. Shows create form when no share exists; shows link, settings checkboxes, expiry presets (1 month / 3 months / 1 year / Never), regenerate, and revoke when a share exists.
- GitHub issue #48 opened and linked to milestone "Phase 7: Shareable Wishlists".
**Why:** Phase 7 per V2_DESIGN.md. User decisions: one link per person (regenerate to invalidate), all statuses on by default, preset expiry, no occasion filtering, branded public page.

---

## [2026-05-07] Bump version to 1.2.0 — Phase 6 release
**By:** Claude Code
**What:** `package.json` version 1.1.0 → 1.2.0. Added `v1.1.0` and `v1.2.0` rows to the versioning table in `CLAUDE.md`. GitHub release `v1.2.0` cut.
**Why:** Phase 6 (Other Occasions) is complete and deployable; tagging a stable release point.

---

## [2026-05-07] Phase 6 complete — Other Occasions
**By:** Claude Code
**What:** Marked Phase 6 (Other Occasions) as **done** in `CLAUDE.md` and `docs/V2_DESIGN.md`. No code changes — this entry records the phase completion milestone.
**Why:** All Phase 6 scope shipped: `occasions` table, per-occasion reminders, site-wide occasions with per-person exclusions, dashboard/calendar updates, and person-detail occasion management. Phase 7 (Shareable Wishlists) is now the next pending phase.

---

## [2026-05-06] Site-wide occasions with per-person exclusions
**By:** Claude Code
**What:**
- `db/schema.ts`: Made `reminders.personId` nullable (site-wide occasion reminders have no single person). Added new `occasionPersonExclusions` table (composite PK: occasionId + personId) to track per-person exclusions from site-wide occasions.
- `lib/occasions-queries.ts`: Added `listSiteWideOccasions`, `getExcludedPeopleForOccasion`, `getSiteWideOccasionsForPerson` query helpers.
- `app/settings/occasion-actions.ts` (new): Server actions for creating, updating, and deleting site-wide occasions, plus `excludePersonFromOccasion` / `includePersonInOccasion` toggle actions.
- `lib/reminders.ts`: Added `ensureSiteWideOccasionReminders` (creates 30/14/7/1-day reminders with personId = NULL), `findDueSiteWideReminders` (site-wide equivalent of `findDueReminders`), updated `runDailyReminders` to send one email per due site-wide occasion listing all included people.
- `lib/notify/email.ts`: Added `sendSiteWideOccasionEmail` — "Christmas is in 30 days. You've got to get gifts for: • Person 1, • Person 2…" format.
- `app/settings/page.tsx`: Added "Site-wide occasions" section — add/edit/delete occasions; per-person pill buttons to toggle exclusions.
- `app/people/[id]/page.tsx`: Shows site-wide occasions above personal ones, each with a "Site-wide" badge and an Exclude/Include toggle.
**Why:** User request — occasions like Christmas and Easter apply to everyone; one reminder email listing all relevant people is more useful than one email per person.

---

## [2026-05-06] Fix missing helpers in people actions + login error handling (issues #44, #34)
**By:** Claude Code
**What:**
- `app/people/actions.ts`: Restored seven helper functions that were accidentally removed in a prior refactor (`parseMoneyToPence`, `parseTagNames`, `parseSizes`, `parseWishlistStatus`, `syncTagsForPerson`, `personBelongsToUser`, `wishlistBelongsToUser`, `getWishlistContextForSearch`). Also replaced the dead `import { auth }` with the correct `import { requireCurrentUserId } from "@/lib/people-queries"`.
- `app/login/page.tsx`: Wrapped the credentials `signIn()` call in try/catch to catch `AuthError`. On `CredentialsSignin`, redirects to `/login?error=CredentialsSignin` and shows a user-friendly "Incorrect email or password." message instead of a generic server error page.
**Why:** Issue #44 — runtime `ReferenceError: requireCurrentUserId is not defined` broke all person create/edit actions on the Pi. Issue #34 — Auth.js v5 throws `CredentialsSignin` (not returns null) on bad credentials; without a catch it surfaced as an unhandled 500.

---

## [2026-05-06] Rebuild add occasion form as dedicated client component
**By:** Claude Code
**What:**
- Created `app/people/[id]/add-occasion-form.tsx` — a standalone client component with a clean inner `Form` component that remounts fresh on every open (via incrementing key).
- `Form` is separate from `AddOccasionForm` so it is completely unmounted (not just hidden) when closed; no stale state possible.
- Name field is uncontrolled with `autoComplete="new-password"`.
- Month/day selects (`defaultValue` only) appear only when the selected kind needs a date; all other kinds skip the date section entirely.
- Month names displayed in full (January…December) rather than numbers.
- Wired into `page.tsx` — the page was previously rendering its own inline `<details>` form which was the actual source of all the previous bugs (the client component that was being edited before was never rendered).
**Why:** Previous `<details>`-based form in page.tsx was a server component with no React state, making autofill and conditional field logic impossible to control reliably.

---

## [2026-05-06] Redesign add occasion form from scratch
**By:** Claude Code
**What:**
- Replaced `<details>` toggle with a button + conditional render for the add form.
- Extracted `AddOccasionForm` as a standalone component — it is fully unmounted when hidden and gets a new `key` each time it opens, guaranteeing a fresh DOM with no leftover state or autofill.
- Name input uses `autoComplete="new-password"` (the reliable cross-browser autofill bypass) and is uncontrolled.
- Month/day selects use `defaultValue` rather than controlled `value`, so they reset naturally on remount.
- Added Cancel buttons at top and bottom of the form.
- Applied `autoComplete="new-password"` to the edit form name input as well.
**Why:** Multiple iterations of the previous `<details>`-based approach could not reliably prevent Chrome autofill or stale React state. Ground-up rewrite removes all those failure modes.

---

## [2026-05-06] Occasion form cleanup and router cache fix
**By:** Claude Code
**What:**
- Simplified `occasion-actions.ts`: import `requireCurrentUserId` from shared `lib/people-queries`, DRY up date-building with `buildOccasionDate` helper, fix dead guard in `buildDateFromParts` (check raw values before padStart), remove redundant `revalidatePath("/people")`.
- Simplified `occasion-section-client.tsx`: extract `MONTH_OPTIONS`/`DAY_OPTIONS` as module constants shared between add and edit forms, remove redundant `addOpen` state (formKey alone drives reset), name input uncontrolled to prevent autofill persistence.
- Added `staleTimes: { dynamic: 0 }` to `next.config.mjs` so navigating away and back re-fetches the page, fixing stale occasion date dropdowns showing 1/1 for preset holidays.
- Removed stale test video from `issue/` directory.
**Why:** Simplify review found duplicated utilities, a dead guard, and premature state. Router cache was causing server-rendered page state to be served stale on client-side navigation.

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
