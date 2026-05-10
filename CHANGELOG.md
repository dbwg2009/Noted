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

## [2026-05-10] Fix: reminder email showed empty shortlist even when wishlist items exist
**By:** Claude Code
**What:** `buildShortlistForPerson` in `lib/reminders.ts` now includes active (non-purchased/given) wishlist items directly in the shortlist, not just AI-found products and AI suggestions. Wishlist items are ordered after products but before suggestions. Added a third `ShortlistEntry` kind `"wishlist"` and updated `lib/notify/email.ts` to label them as "Wishlist" in the email.
**Why:** Users who had wishlist items but had not run the AI product search saw "No shortlist yet" in the test reminder email, even though items were present in the app.

## [2026-05-10] Unit tests for fromAddress and digest email renderers
**By:** Claude Code
**What:** Added `lib/__tests__/email.test.ts` with 16 tests covering `fromAddress` (specific key, fallback, hardcoded default, double-quote strip, single-quote strip, no inner-quote strip) and both text/HTML digest renderers (no prices, no external buy links, item titles present, retailer name present, person-page link present, empty shortlist message).
**Why:** Codacy AI reviewer flagged missing test coverage for the quote-stripping logic and email renderers added in the email fix PR.

---

## [2026-05-10] Fix sender display name and reduce promotional classification of digest emails
**By:** Claude Code
**What:** Two changes to `lib/notify/email.ts`. (1) `fromAddress()` now strips leading/trailing quote characters from the env var value before returning it, so display names like "Noted Support" survive Docker Compose .env parsing. (2) Removed external retailer URLs and prices from the birthday digest shortlist (both text and HTML renderers); the shortlist now shows item title, kind tag, and retailer name only, linking to the Noted person page for full details. Prices and buy-links are the primary signals Gmail uses to classify emails as promotional.
**Why:** User reported the digest email landed in the Promotions tab and the sender display name ("Noted Support") was not showing on the help@ password reset email.

---

## [2026-05-10] Refactor gift-groups queries to eliminate duplication and fix Codacy HIGH
**By:** Claude Code
**What:** Extracted a module-level named `fetchGroups(where: SQL)` function from `listGiftGroups` in `lib/gift-groups-queries.ts`. The owned query now calls `fetchGroups` with the user-id condition, and the contributing/pending queries use a `fetchById` helper that delegates to `fetchGroups`. Eliminates the 9-line query duplication Codacy detected and resolves the HIGH "non-serializable expression" issue caused by the inner async arrow function.
**Why:** Codacy flagged the inner `const fetchGroups = async () =>` as a HIGH issue and detected +9 duplicate lines; both rooted in the same structural problem.

---

## [2026-05-10] In-app accept/decline for existing users + register link for new users
**By:** Claude Code
**What:** When an existing registered user is added as a contributor, they now get an invite token (same as unregistered users) and must explicitly accept or decline via the app rather than being auto-accepted. A new "Pending invitations" section on `/gift-groups` shows these with Accept/Decline buttons. Unregistered users now receive a "Get started" link pointing to `/login/register?callbackUrl=...` instead of the invite page. New `acceptLinkedInvite` and `declineInvitation` server actions added.
**Why:** User feedback — existing users should be able to accept or decline in-app; non-members should land on sign-up not login.

---

## [2026-05-10] Per-email-type from addresses with shared fallback
**By:** Claude Code
**What:** Added `EMAIL_FROM_REMINDERS`, `EMAIL_FROM_INVITES`, and `EMAIL_FROM_AUTH` env vars. Each email type uses its specific var if set, falling back to `EMAIL_FROM`, then to the hardcoded Resend test address. Updated `lib/notify/email.ts` (`fromAddress()` helper), `app/api/auth/forgot/route.ts`, `.env.example`, and `docker-compose.yml`.
**Why:** User wanted different from addresses per email type (e.g. `reminders@noted.dbwg2009.uk`, `help@noted.dbwg2009.uk`) after setting up their own verified domain.

---

## [2026-05-09] Fix accept-before-notify race and improve email error logs
**By:** Claude Code
**What:** In `addContributor`, existing-user contributors are now inserted without `inviteAcceptedAt`; it is set only after `sendGroupGiftNotification` succeeds. If the email fails, the row stays in a re-invitable state so `resendInvite` can retry. All three `console.error` calls now include the recipient email address.
**Why:** Codacy AI flagged that setting `inviteAcceptedAt` before the email meant a failed notification left the contributor permanently stuck with no retry path. Log messages also lacked the recipient address, making them hard to act on in production.

---

## [2026-05-09] Deduplicate invite token generation into newInvite() helper
**By:** Claude Code
**What:** Extracted `randomUUID()` + 30-day expiry into a `newInvite()` helper in `app/gift-groups/actions.ts`. Both `addContributor` and `resendInvite` now call it instead of repeating the same two lines.
**Why:** Codacy AI flagged the duplication — if the invitation policy changes (e.g. expiry window), it now only needs updating in one place.

---

## [2026-05-09] Fix invite email not sending — generate UUID in application code
**By:** Claude Code
**What:** `addContributor` and `resendInvite` in `app/gift-groups/actions.ts` now generate the `inviteToken` UUID via `randomUUID()` in application code and pass it explicitly in the insert/update, rather than relying on the DB column default (`gen_random_uuid()`).
**Why:** If `db:push` had not been run after adding `.defaultRandom()` to the schema, the column had no server default, so the insert returned `null` for `inviteToken` and `sendGroupGiftInvite` was never called. Generating it in application code makes the flow migration-independent.

---

## [2026-05-09] Fix useSearchParams Suspense boundary on /login/register
**By:** Claude Code
**What:** Extracted form logic into `RegisterForm` component in `app/login/register/page.tsx`, wrapped it in `<Suspense>`. The page shell remains the default export.
**Why:** Next.js requires `useSearchParams()` to be inside a Suspense boundary during static prerendering. Without it the Docker build failed with "Export encountered an error on /login/register/page".

## [2026-05-09] Fix Promise-returning form action Codacy flags
**By:** Claude Code
**What:** Introduced `app/gift-groups/action-form.tsx` — a thin client component wrapper around `<form>` that accepts `action: (FormData) => Promise<void>` and internally wraps it in a void-returning arrow function. Replaced the 5 flagged `<form action={serverAction}>` usages in `app/gift-groups/[id]/page.tsx` and `app/gift-groups/invite/[token]/page.tsx` with `<ActionForm action={serverAction}>`.
**Why:** Codacy flags `action={asyncFn}` as "Promise-returning function in void attribute" because it lacks React 19's type context where form `action` already accepts `Promise<void>`. Arrow wrappers directly in server components break Next.js RSC action serialization; passing the server action as a prop to a client component (which then wraps it) is the correct Next.js pattern that satisfies both the type checker and the linter.

## [2026-05-09] Fix third-round Codacy issues on PR #115
**By:** Claude Code
**What:** Fixed 7 new issues flagged by Codacy on the latest push.
- `eslint.config.mjs`: configured `@typescript-eslint/no-misused-promises` with `checksVoidReturn: { attributes: false }` — suppresses the "Promise-returning function in void attribute" error for server action form props. Arrow-function wrappers are not viable here (they break Next.js RSC action serialization).
- `app/login/register/page.tsx`: replaced `window.location.href = dest` with `router.push(dest)` using Next.js `useRouter` — eliminates the Codacy XSS flag on direct `location.href` assignment.
- `lib/gift-groups-queries.ts`: removed unused `or` import from drizzle-orm.
**Why:** Codacy flagged the async form actions as high-severity error-prone and the location.href assignment as a high-severity XSS risk. ESLint rule configuration is the correct fix for the server action pattern; router.push is the safer and idiomatic Next.js navigation method.

## [2026-05-09] Fix second-round Codacy issues on PR #115
**By:** Claude Code
**What:** Fixed two further issues flagged in Codacy's follow-up review.
- `app/gift-groups/actions.ts` (`updateContributor`): normalize email to lowercase on save — consistent with `addContributor` which already did this, prevents case-fragmented duplicates.
- `app/gift-groups/actions.ts` (`addContributor`): check for existing contributor row before inserting when the invited user already has an account — prevents a 500 crash from the unique `(groupId, userId)` index added in the previous round.
**Why:** Inconsistent email casing causes silent data fragmentation; missing duplicate check causes an unhandled constraint violation crash.

## [2026-05-09] Fix Codacy and CodeRabbit issues on PR #115
**By:** Claude Code
**What:** Fixed all actionable review issues from Codacy and CodeRabbit on the collaborative contributors PR.
- `app/gift-groups/invite/[token]/page.tsx`: removed unsafe mutation-on-GET — invite page now shows an "Accept invite" button; mutation only happens on form submit via new `acceptInviteAction`. Error states (`wrong_account`, `failed`) are surfaced via URL search param redirect.
- `app/gift-groups/actions.ts`: added `acceptInviteAction(formData)` server action that delegates to `acceptInvite` and redirects on error rather than returning to render. Fixed case-sensitive email comparison in `acceptInvite` — now normalises both sides to lowercase.
- `app/login/register/page.tsx`: validated `callbackUrl` query param starts with `/` before using it in `window.location.href` — prevents potential `javascript:` redirect XSS.
- `db/schema.ts`: added `.defaultRandom()` to `inviteToken` so new contributor rows always receive a UUID token (previously NULL, breaking invite emails). Added `uniqueIndex` on `(groupId, userId) WHERE userId IS NOT NULL` to prevent duplicate contributor rows for the same user.
- `app/gift-groups/[id]/page.tsx`: consolidated two duplicate resend-invite forms into one with conditional text/colour.
**Why:** Codacy flagged mutation-on-GET, XSS risk, and case-sensitivity bug as high severity. CodeRabbit flagged the missing invite token default and duplicate form blocks.

## [2026-05-09] Collaborative group gift contributors
**By:** Claude Code
**What:** Extended Phase 8 group gifts with multi-user collaboration. Contributors with accounts can see and interact with group gifts they've been added to.
- `db/schema.ts`: added `userId` (FK → users), `inviteToken` (uuid unique), `inviteExpiresAt`, `inviteAcceptedAt` columns to `gift_group_contributors`.
- `lib/gift-groups-queries.ts`: `listGiftGroups` now returns `{ owned, contributing }` split; `getGiftGroup` allows contributor access; new `getContributorByInviteToken`.
- `lib/notify/email.ts`: added `sendGroupGiftNotification` (existing users) and `sendGroupGiftInvite` (new users with invite link).
- `app/gift-groups/actions.ts`: `addContributor` now checks email against users table — links immediately + notifies if found, or generates 30-day invite token + sends invite email if not. New actions: `resendInvite`, `acceptInvite`, `leaveGroup`, `updateMyContribution`.
- `app/gift-groups/page.tsx`: split into "Groups I manage" and "Groups I'm contributing to" sections.
- `app/gift-groups/[id]/page.tsx`: shows owner controls or contributor controls (edit own amount, leave group) based on role. Contributor rows show Linked/Invite pending/Invite expired badges.
- `app/gift-groups/invite/[token]/page.tsx`: new public invite acceptance page. Handles wrong-account blocking, expired tokens, already-accepted states.
- `app/login/register/page.tsx`: forwards `callbackUrl` query param through to post-registration login redirect so invite links survive the sign-up flow.
**Why:** App is multi-user; contributors should be able to view and manage their own involvement in group gifts without relying on the organiser for everything.

## [2026-05-08] Fix Codacy review issues on phase 8 bundle
**By:** Claude Code
**What:** Addressed all Codacy comments on PR #113.
- `db/schema.ts`: added `.references(() => occasions.id, { onDelete: "set null" })` FK to `wishlist_items.occasion_id`.
- `app/people/actions.ts`: extracted `resolveOccasionId()` helper — validates that the submitted `occasionId` belongs to the current user (security), uses `Number.isNaN` instead of `|| null` (correctness); added `occasionId` field to `createWishlistItem` so it can be set on creation.
- `app/people/occasion-actions.ts` + `app/settings/occasion-actions.ts`: replaced `kind as any` with `kind as OccasionKindValue` (typed union from the `occasionKind` enum).
- `app/people/[id]/wishlist-item-edit-form.tsx`: wrapped server action props in `(fd) => void action(fd)` to satisfy the form `action` prop typing.
**Why:** Codacy flagged a security gap (unverified occasionId), a parse correctness bug, an `any` cast, and a missing FK — all legitimate issues. The fixes harden the data boundary without changing visible behaviour.

---

## [2026-05-08] Phase 8 bundle — occasion-linked gifts, reminder suppression, duplicate occasion guard
**By:** Claude Code
**What:** Four features bundled into the phase-8-group-gifts branch (issues #108, #109, #110, #112).
- `db/schema.ts`: added nullable `occasion_id` integer column to `wishlist_items`; updated `wishlistItemsRelations` to include the `occasion` relation.
- `app/people/[id]/wishlist-item-edit-form.tsx` (new): client component replacing the inline edit `<details>`. Renders the update form (with occasion picker) and intercepts status → "given" to switch inline to the "Record gift" form, prompting for givenOn / pricePaid / reactionNotes before submitting to `markWishlistItemGiven`. Eliminates the need for a separate "Mark as given" button.
- `app/people/[id]/page.tsx`: imports `WishlistItemEditForm`; builds `allOccasionOptions` (person-specific + site-wide) and `occasionNameById` map; shows a violet occasion badge on each wishlist item card when linked; removed the now-redundant standalone "Mark as given" `<details>` block; removed the server-only `formatPenceInput` helper (moved into the client component).
- `app/people/actions.ts` (`updateWishlistItem`): parses `occasionId` from form data and persists it on the wishlist item.
- `app/people/occasion-actions.ts` (`createOccasion`): added duplicate-kind check — if a preset occasion of the same kind already exists for the person (or site-wide when no personId), returns with a flash error rather than inserting a duplicate. Only applies to non-custom kinds.
- `app/settings/occasion-actions.ts` (`createSiteWideOccasion`): same duplicate guard for site-wide occasions; sets a `settings_flash` cookie with an error message.
- `lib/reminders.ts`: added `allWishlistItemsDone()` helper; `buildDigestForUser` now skips people whose every wishlist item is `purchased` or `given` (no email block for them); `runDailyReminders` still marks those reminders as sent to prevent daily re-triggers; site-wide occasion path filters `finalPeople` to exclude anyone whose wishlist items linked to that specific `occasionId` are all purchased/given (people with no linked items are kept).
**Why:** #110 closes the gap where gifts couldn't be associated with a specific occasion. #108 ensures the status dropdown to "given" always triggers history capture rather than a silent status update. #109 prevents noise emails when the user has already sorted all gifts for an occasion. #112 prevents accidental duplicate reminders from duplicate preset occasions.

---

## [2026-05-08] Phase 8 — Group Gifts (v1.4.0)
**By:** Claude Code
**What:** Implemented Phase 8 of the V2 roadmap. New schema: `gift_group_status` enum, `gift_groups` table (userId, personId, wishlistItemId, occasionId, title, targetAmount, status, notes), `gift_group_contributors` table (groupId, name, email, contributionAmount, paid). New files: `lib/gift-groups-queries.ts`, `app/gift-groups/actions.ts`, `app/gift-groups/page.tsx`, `app/gift-groups/[id]/page.tsx`. Updated: `components/nav.tsx` (Groups tab), `app/people/[id]/page.tsx` (👥 Group gift button on each wishlist item). Bumped version 1.3.5 → 1.4.0.
**Why:** Phase 8 of the V2 roadmap. Closes #28. Lets users coordinate split purchases across multiple contributors — track who is chipping in, how much, and whether they've paid. Target amount optional; when set, a progress bar shows funding progress.

---

## [2026-05-08] Force postcss ≥8.5.10 via npm overrides to resolve Dependabot alert #10 (v1.3.5)
**By:** Claude Code
**What:** Added `"overrides": { "postcss": "^8.5.10" }` to `package.json`. Bumped direct devDep from `^8.4.49` → `^8.5.10` to match. Bumped package version `1.3.4` → `1.3.5`. Regenerated `package-lock.json` (drops the nested `node_modules/next/node_modules/postcss@8.4.31`). Fixes #101 (GHSA-qx2v-qp2m-jg93).
**Why:** Next.js ships an internal copy of `postcss@8.4.31`; the XSS fix (unescaped `</style>` in CSS stringify output) landed in `8.5.10`. Our top-level postcss was already fixed; the override forces the same version into Next.js's nested dep tree.

---

## [2026-05-08] Bump version to 1.3.4 and compact CHANGELOG
**By:** Claude Code
**What:** `package.json` version `1.3.3` → `1.3.4`. Archived entries from 2026-05-06 and earlier to `CHANGELOG-legacy.md` to keep the active log under 300 lines.
**Why:** Patch release covering all repo advisory improvements: Vitest unit tests, husky/commitlint hooks, Sentry error tracking, Dependabot auto-merge, Trivy container scanning, Docker memory limits, health check endpoint, npm vulnerability upgrades (Next.js, next-auth, drizzle-kit), CI concurrency groups, and release helper workflow.

---

## [2026-05-07] Add release helper workflow
**By:** Claude Code
**What:** Added `.github/workflows/release.yml` — a `workflow_dispatch` workflow with three inputs (`tag`, `title`, `notes`) that runs `gh release create --latest`. Accessible via Actions → Release in the GitHub UI.
**Why:** Removes friction from the release process. No automation — still fully manual and phase-gated — just surfaces the `gh release create` command in the GitHub UI so releases can be cut without the CLI.

---

## [2026-05-07] Fix Trivy SARIF severity alignment (limit-severities-for-sarif)
**By:** Claude Code
**What:** Added `limit-severities-for-sarif: true` to the Trivy scan step in `.github/workflows/docker-publish.yml`.
**Why:** With `format: sarif`, trivy-action builds the SARIF report with all severities and the exit code reflects those broader findings — causing exit 1 even after CRITICAL CVEs were resolved. Setting `limit-severities-for-sarif: true` constrains both the SARIF report and the exit-code check to the specified severity (CRITICAL), so the build only fails when CRITICAL unfixed CVEs are actually present.

---

## [2026-05-07] Add concurrency groups to CI workflows
**By:** Claude Code
**What:** Added `concurrency: group: ..., cancel-in-progress: true` to `pr-checks.yml` (group key: `pr-checks-${{ github.ref }}`) and `docker-publish.yml` (group key: `docker-publish-${{ github.ref }}`).
**Why:** Rapid successive pushes to the same branch were queuing duplicate runs. For the Docker multi-arch build (~10 min) this wasted a full build slot on a result that would be immediately superseded. Cancelling the stale run gives faster feedback on the latest commit.

---

## [2026-05-07] Upgrade Next.js, next-auth, drizzle-kit to fix npm vulnerabilities
**By:** Claude Code
**What:** `next` 15.2.9 → 15.5.18 (+ `eslint-config-next` to match), `next-auth` 5.0.0-beta.25 → 5.0.0-beta.31, `drizzle-kit` 0.30.x → 0.31.10. TypeScript and tests verified clean. 4 moderate vulnerabilities remain in upstream transitive deps (esbuild in drizzle-kit internals via `@esbuild-kit/core-utils`); postcss was subsequently fixed via npm overrides (see 2026-05-08 entry).
**Why:** High severity Next.js CVEs (SSRF, cache poisoning, HTTP request smuggling, DoS, content injection), moderate next-auth email misdelivery CVE. The high severity issues are the priority given the app is publicly reachable.

---

## [2026-05-07] Remove esbuild binaries from Docker runner image (CVE-2024-24790, CVE-2025-68121)
**By:** Claude Code
**What:** Added `rm -rf node_modules/@esbuild` to the runner stage in `Dockerfile`, merged into the existing `mkdir/chown` RUN step.
**Why:** Next.js standalone file tracing includes `@esbuild/linux-x64` (esbuild v0.19.12, compiled with Go 1.20.12) in the runner image even though esbuild is a build-time tool not needed at runtime. The binary carries two CRITICAL Go stdlib CVEs: CVE-2024-24790 (`net/netip`) and CVE-2025-68121 (`crypto/tls`). Stripping the `@esbuild` namespace from the final image removes the attack surface. Fixes #90.

---

## [2026-05-07] Add app health check endpoint and Docker healthcheck
**By:** Claude Code
**What:** Added `app/api/health/route.ts` (`GET /api/health` → `{ status: "ok" }`). Added `healthcheck` to the `app` service in `docker-compose.yml` (curl `/api/health`, 10s interval, 30s start period, 6 retries). Upgraded `cron` depends_on condition from `service_started` to `service_healthy`. Removed the manual readiness poll loop from the `cron` entrypoint — now redundant.
**Why:** The app service had no health check so Docker couldn't distinguish "container running" from "app ready". The cron sidecar's manual curl loop against `/api/auth/providers` was a fragile workaround. `service_healthy` is the correct pattern.

---

## [2026-05-07] Fix trivy-action version in docker-publish workflow
**By:** Claude Code
**What:** Bumped `aquasecurity/trivy-action` from `0.31.0` to `v0.36.0` in `.github/workflows/docker-publish.yml`.
**Why:** Version `0.31.0` does not exist as a release tag — GitHub Actions failed to resolve it, breaking every push to Development. `v0.36.0` is the current latest release. Fixes #86.

## [2026-05-07] Add Docker memory limits and wire Sentry env vars
**By:** Claude Code
**What:** Added `deploy.resources.limits.memory` to all four services in `docker-compose.yml`: `db` (512m), `migrate` (256m), `app` (512m), `cron` (64m). Also added `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` to the app service environment (all optional, default empty).
**Why:** Repo advisory item 7 — without limits, a memory leak or traffic spike could exhaust Pi RAM and trigger the OOM killer, potentially killing the Postgres process. Limits ensure Docker restarts the affected container cleanly. Sentry vars needed as a follow-up to item 3 — the code was wired up but the vars weren't passed through in Docker.

---

## [2026-05-07] Add Trivy container image vulnerability scan
**By:** Claude Code
**What:** Updated `docker-publish.yml`: added `security-events: write` permission; added `app_primary` output to the tags step (single ref for Trivy); added `Scan app image for vulnerabilities` step using `aquasecurity/trivy-action@0.31.0` (CRITICAL severity, ignore-unfixed, SARIF output); added `Upload Trivy results to GitHub Security tab` step.
**Why:** Repo advisory item 6 — Docker image contains Alpine Linux and all npm deps; any could carry known CVEs. Scan runs after push, fails on critical fixable CVEs, uploads results to the GitHub Security tab.

---

## [2026-05-07] Add Dependabot auto-merge workflow
**By:** Claude Code
**What:** Added `.github/workflows/dependabot-auto-merge.yml`. Triggers on Dependabot PRs only; uses `dependabot/fetch-metadata` to read the update type; calls `gh pr merge --auto --squash` for patch and minor bumps. Major version bumps are left open for manual review.
**Why:** Repo advisory item 5 — Dependabot PRs were piling up unmerged. Auto-merge is gated behind CI passing and branch protection rules, so a breaking update can't sneak through.

---

## [2026-05-07] Add Sentry error tracking
**By:** Claude Code
**What:** Installed `@sentry/nextjs`. Added `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` (each guards init behind `SENTRY_DSN` check), `instrumentation.ts` (Next.js 15 hook loading server/edge configs), and updated `next.config.mjs` to wrap with `withSentryConfig` (source map upload disabled when `SENTRY_ORG`/`SENTRY_PROJECT` are absent). `.env.example` updated with three new optional vars.
**Why:** Repo advisory item 3 — app runs unattended on a Pi; all errors were silent `console.error` calls. Sentry captures unhandled exceptions with stack traces and sends email alerts on first occurrence. All three env vars are optional so self-hosters who don't want Sentry can leave them blank.

---

## [2026-05-07] Add husky + lint-staged + commitlint pre-commit enforcement
**By:** Claude Code
**What:** Installed `husky`, `lint-staged`, `@commitlint/cli`, `@commitlint/config-conventional`. Added `.husky/pre-commit` (runs lint-staged on staged `.ts`/`.tsx` files) and `.husky/commit-msg` (validates Conventional Commits format). `commitlint.config.ts` extends `@commitlint/config-conventional`. `prepare` script added to `package.json` so hooks install on `npm install`. `lint-staged` config in `package.json` runs ESLint with `--max-warnings=0`.
**Why:** Repo advisory item 2 — CLAUDE.md requires conventional commits and ESLint-clean code on every commit but nothing enforced it. Now a badly formatted commit message or an ESLint error blocks the commit before it reaches GitHub.

---

## [2026-05-07] Add Vitest unit tests for lib/birthdays and lib/occasions
**By:** Claude Code
**What:** Added Vitest test framework (`vitest`, `@vitest/coverage-v8`). 57 tests across `lib/__tests__/birthdays.test.ts` and `lib/__tests__/occasions.test.ts` covering date parsing, next-occurrence rollover, age calculation, money formatting, Easter algorithm, known occasion labels, and occurrence countdown logic. `vitest.config.ts` scopes coverage to the two tested files with 85% line/function and 80% branch thresholds. `pr-checks.yml` extended with a `Tests with coverage` step. Test scripts added to `package.json` (`test`, `test:watch`, `test:coverage`).
**Why:** Repo advisory (item 1): zero test coverage was the highest-priority gap. Pure date/money logic in these two files is the safest starting point; DB/email/API files require integration tests and are excluded from the coverage scope for now.

---

## [2026-05-07] Bump version to 1.3.3
**By:** Claude Code
**What:** `package.json` version `1.3.1` → `1.3.3` (skipping `1.3.2` which landed on main via a direct hotfix). Prepares Development → main PR.
**Why:** Version alignment before opening the Development → main PR. Covers: `actions/checkout` v4 → v6 (CI), drizzle-orm 0.45.2 security fix, ESLint config, Docker action upgrades.

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
