# Onboarding for AI agents

Read this first. It exists so any AI session (Claude Code, Cursor, Gemini, etc.) can pick up where the previous one left off without re-deriving the project.

---

## MANDATORY: Read memory files before doing anything

**Every AI agent must read all files in `.claude/memory/` before taking any action — not just before touching GitHub, but before writing code, making decisions, or answering questions about process.**

The index is at `.claude/memory/MEMORY.md`. Each file there contains locked rules about how this project is run. Violating them will cause rework.

---

## What this project is

A personal, multi-user web app for tracking friends' and family birthdays, capturing gift ideas, using AI to find real products with prices + buy links, and emailing users reminders ahead of each birthday.

Owner / initial admin: **dbwg2009**.

## Where to find things

- **`docs/DESIGN.md`** — full design: goals, features, data model, architecture, build phases, repo layout. **Read this before changing anything non-trivial.**
- **`docs/V2_DESIGN.md`** — **V2 roadmap**: five new phases (6–10) with schema deltas, new routes, and step-by-step implementation notes. **Read this before starting any V2 phase.** Each phase has a corresponding GitHub milestone.
- **`docs/DECISIONS.md`** — locked decisions and a change log (single-user, email reminders, UK/GBP, OpenRouter LLM, Docker primary). Update this when a decision changes; do not silently override.
- **`CHANGELOG.md`** — running log of every significant change: what changed, why, and when. **All AI agents must update this on every commit without exception.** See the file for the entry format. (Automated GitHub Release notes come from **Release Please** and do not replace this file — see Versioning.) When this file grows past **~300 lines**, **`.github/workflows/changelog-archive.yml`** on **`Development`** moves oldest entries to **`CHANGELOG-legacy.md`** (or run **`npm run changelog:compact`** locally).
- **`.github/release-please-config.json`** + **`.github/release-please-manifest.json`** — Release Please manifest config (semver bump, release PR, GitHub Release body). **`CHANGELOG.md` is not modified by Release Please** (`skip-changelog`).
- **`README.md`** — quick-start (Docker + native Node).
- **`db/schema.ts`** — the source of truth for the DB shape.
- **`lib/auth.ts`** — Auth.js v5 config (Credentials provider for email/password, Drizzle adapter). Previously used Resend magic-link + `ALLOWED_EMAIL`.
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

### V1 (complete)

| Phase | Status | Scope |
|-------|--------|-------|
| 0 — Scaffold | **done** | Next.js + Tailwind + Drizzle + Auth.js + Docker stack |
| 1 — People & wishlists | **done** | CRUD for people, tags, wishlist items with status workflow + source notes |
| 2 — AI product lookup | **done** | OpenRouter (LLM) primary, eBay Browse API fallback, manual entry |
| 2.5 — UI polish | **done** | Multi-page layout: dashboard `/`, calendar `/calendar`, people `/people` (cards) → `/people/new` and `/people/[id]`. Shared nav, avatars, status pills, countdown badges |
| 3 — Suggestions & history | **done** | "Suggest gifts" via OpenRouter with full person context (wishlist + tags + notes + history + budget). `suggestions` table. Promote suggestion → wishlist item, or dismiss. Gift history with reaction notes; "Mark as given" on wishlist items auto-creates history entry; standalone history form for retroactive entries |
| 4 — Reminders | **done** | Default 30/14/7/1-day reminders auto-created per person. Daily digest email via Resend with budget-aware shortlist (products + suggestions). `/api/cron/reminders` endpoint protected by `CRON_SECRET`; `cron` sidecar in compose pings it on `CRON_INTERVAL_SECONDS` (default 86400). Per-person "Send test now" button. |
| 5 — Polish | **done** | Photo uploads (`lib/storage.ts`, local filesystem or base64), iCal feed (`/api/ical/[token]`, `users.ical_token`), mobile tweaks (horizontal scroll on calendar) |

### V2 (in progress — see `docs/V2_DESIGN.md` for full spec)

| Phase | Status | Scope |
|-------|--------|-------|
| 6 — Other Occasions | **done** | Anniversary, Christmas, Mother's/Father's Day, custom occasions. New `occasions` table + per-occasion reminders. Dashboard + calendar updated. |
| 7 — Shareable Wishlists | **done** | Read-only token-based public link to a person's wishlist. New `wishlist_shares` table. `/share/[token]` public route. |
| 8 — Group Gifts | **done** | Coordinate split purchases. `gift_groups` + `gift_group_contributors` tables. `/gift-groups` UI. |
| 9 — Price-Drop Alerts | **pending** | Watch a saved product; email when price drops below target. `price_alerts` table + cron extension + eBay price check. |
| 10 — Browser Extension | **pending** | Chrome/Firefox MV3 extension: right-click → save product to wishlist. New `/api/v1/wishlist-items` REST endpoint + `api_keys` table. |

When starting work, find the first **pending** phase above. **Don't skip phases** without explicit user approval. For V2, read `docs/V2_DESIGN.md` before implementing anything — it has the schema deltas, file lists, and implementation notes for each phase.

## Tech stack quick reference

- Next.js 15, App Router, server actions, **standalone output**.
- TypeScript strict.
- Drizzle ORM. Schema in `db/schema.ts`. Run migrations with `npm run db:push` (or via the `migrate` service in compose).
- Auth.js v5 (`next-auth@5.0.0-beta.x`) with Credentials provider + Drizzle adapter. JWT sessions (required by Credentials — DB sessions unsupported).
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
- Session strategy is **JWT** (required by the Credentials provider). Do not switch back to database sessions — Credentials + DB sessions is explicitly unsupported by Auth.js.
- `ALLOWED_EMAIL` is optional now; do not rely on it for multi-user auth.
- Don't build features beyond the current phase without asking the user. The build order matters because each phase depends on the previous data shape.
- Don't commit `.env` or any secrets.
- Don't rewrite working code "for cleanliness" — small surface area, personal app, ship it.
- Don't add a UI component library (e.g. shadcn) without asking — we're keeping deps minimal.

## Versioning & GitHub releases

The repo uses **semantic versioning** tied to build phases. All tags and releases live at https://github.com/dbwg2009/Noted/releases.

| Tag | Phase completed | Notes |
|-----|----------------|-------|
| `v0.1.0` | Phase 0 — Scaffold | Initial Next.js + Docker stack |
| `v0.3.0` | Phase 3 — Suggestions & History | AI suggestions, gift history |
| `v0.4.0` | Phase 4 — Reminders | Email digests, cron sidecar |
| `v1.0.0` | Phase 5 — Polish & Rebrand | All phases complete, Noted brand |
| `v1.1.0` | Auth overhaul + infra | Credentials provider, JWT sessions, multi-arch Docker, perf fixes |
| `v1.2.0` | Phase 6 — Other Occasions | Occasions table, per-occasion reminders, site-wide occasions with exclusions |
| `v1.3.0` | Phase 7 — Shareable Wishlists | Token-based public wishlist links, configurable visibility, expiry presets |
| `v1.4.0` | Phase 8 — Group Gifts | `gift_groups`, `gift_group_contributors`, `/gift-groups`, invites |

### Release Please (primary path)

- Workflow: **`.github/workflows/release-please.yml`** runs on every push to **`main`**.
- It opens or updates a **release PR** (title pattern `chore: release X.Y.Z`) that bumps **`package.json`**, updates **`.github/release-please-manifest.json`**, and **does not edit** root **`CHANGELOG.md`** (`skip-changelog` — the human narrative changelog stays separate).
- **Merging that release PR** creates the **git tag** and **GitHub Release**. Tags and GitHub release names use the **`v1.2.3`** form **without** the npm package name prefix (config: `include-component-in-tag: false`).
- Release notes on the GitHub Release are built from **conventional commits** on `main`; the release PR includes a short **intro** (`pull-request-header`) pointing readers at **`CHANGELOG.md`** for fuller context.
- **Commits on `main` must stay conventional** (`feat:`, `fix:`, etc.) so semver and notes stay correct — especially when using **squash merge** (the squash title/body should reflect those types).
- Repo setting required: **Allow GitHub Actions to create and approve pull requests** (Settings → Actions → General → Workflow permissions), unless you switch the workflow to a PAT.

### Manual release workflow (optional)

- **`.github/workflows/release.yml`** (`workflow_dispatch`) and **`gh release create`** remain available for edge cases; they do not replace Release Please for normal ships.

**Release rules (enforced — read carefully):**
- A **GitHub release** (tag) **must** exist for every push or PR that lands on `main` that changes code — normally by **merging the Release Please release PR** after feature work lands. Docs-only changes (CLAUDE.md, GEMINI.md, memory files, design docs, README) do not need a release.
- `MAJOR` — **only** when the user explicitly asks. Never bump major on your own initiative.
- `MINOR` — every completed phase (e.g. `v1.4.0` for Phase 8).
- `PATCH` — every bug fix or non-phase change that lands on `main`.
- **Human `CHANGELOG.md` entries** should stay in the project’s usual format (summary + bullets, issue refs where relevant). Release Please’s GitHub Release body is complementary, not a substitute.

**`package.json` version — do not bump manually:** Agents **must not** change `"version"` in `package.json` to “prepare” a release. **Release Please** sets the version on its **release PR**. If the manifest and `main` drift after an out-of-band release, fix **`.github/release-please-manifest.json`** to match the **latest shipped tag** (do not bump `package.json` preemptively on feature branches for this reason).

**`main` → `Development`:** After merges to `main`, **`.github/workflows/sync-main-to-development.yml`** merges **`main` into `Development`** so the branch does not fall behind squash history. If the job fails (permissions or conflicts), fix branch protection or merge locally.

**GitHub milestones** map 1-to-1 to build phases. Create a new milestone only when a phase starts. Close the milestone as part of the post-release checklist. Milestones 8–10 already exist with due dates.

## Process rules (enforced — read memory files for full detail)

All process rules are stored as individual files in `.claude/memory/`. The index (`MEMORY.md`) lists every file. **Read all of them before doing anything.** Below is a summary — the memory files are authoritative.

### Planning
- For new phases: summarise scope from design doc → ask if scope should change → ask all clarifying questions upfront in a numbered list → wait for explicit "go ahead" before writing any code.
- For small changes (bug fixes, minor tweaks): skip planning, just build.

### Branches
- Every branch is tied to an issue. Open the issue first.
- Always branch from `Development` unless told otherwise. Never from `main`.
- Naming: `phase-N-short-description` for phases, descriptive name for fixes.
- All branches PR into `Development`. Only `Development` PRs into `main`.
- Flag stale branches to the user — never delete unilaterally.

### Commits
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Update `CHANGELOG.md` on every commit without exception.
- **Do not bump `package.json` `"version"`** — Release Please updates it on the release PR (see Versioning).
- If `CHANGELOG.md` is huge and the automated archive has not run yet, you may run **`npm run changelog:compact`** or flag the user; do not silently delete history.

### Pull requests
- **Do not open a PR unless the user explicitly says to.** When in doubt, ask.
- Feature → Development: I open (when told), I can merge.
- Development → main: I open (when user says they're happy), user merges.
- All PRs: use the PR template, assign `dbwg2009`, add labels + milestone, reference the issue.
- Post a progress comment on the issue when a PR is opened.

### Issues
- Every piece of work gets an issue (either of us can open it).
- Use the GitHub issue templates. Assign `dbwg2009`, add labels + milestone.
- Post progress comments to keep the issue up to date throughout.
- Never close an issue without the user's explicit sign-off.

### Post-release checklist (after user confirms merge to main)
1. **Release:** Merge the **Release Please** release PR when it appears (creates tag + GitHub Release). Use **`gh release create`** or **`release.yml`** only if you are not using that PR for this ship.
2. Close the related issue
3. Close the corresponding milestone
4. Delete stray feature branches (keep `Development` and `main`). Confirm **`Development`** caught up (sync workflow or manual merge from `main`).

## Picking up the work

1. **Read `.claude/memory/MEMORY.md` and all linked files first.**
2. Read `docs/DESIGN.md` and `docs/DECISIONS.md`.
3. Check the build phase table above; the first **pending** phase is your next job.
4. Open an issue for the work before creating a branch.
5. Branch from `Development`, commit with conventional commit format, update `CHANGELOG.md` on every commit.
6. Do not open a PR without being asked.
7. After user confirms merge to main: merge Release Please release PR when ready, close issue, close milestone, delete stray branches; ensure `Development` is synced with `main`.

## Known gotchas

- The runner Docker stage is a Next.js **standalone** image — it does NOT have `drizzle-kit` or devDeps. Migrations run via the separate `migrate` service in compose, which uses the `migrator` target from the same Dockerfile.
- The `postgres-js` driver pool defaults are tuned for the Docker Postgres; if Neon is used, may need `ssl: "require"` query param in `DATABASE_URL`.
- Auth.js v5 is in beta; the API may shift between minor versions. Pin the version in `package.json`.
- OpenRouter free models are aggressively rate-limited (a few requests per minute). Two distinct sources of 429: (1) per-account daily/minute caps, and (2) **upstream provider rate limits** that affect all OpenRouter users at once. Upstream limits show up as `Provider returned error` in the body. Fix: switch model via `OPENROUTER_MODEL`, or BYOK at https://openrouter.ai/settings/integrations. The `searchProducts()` orchestrator detects rate-limit-shaped errors and falls through to eBay automatically.
- Reminder cron: `cron` sidecar runs `curl http://app:3000/api/cron/reminders` every `CRON_INTERVAL_SECONDS` (default 86400). The route requires `Authorization: Bearer $CRON_SECRET`. `runDailyReminders()` is idempotent — `last_sent_for_year` ensures the same reminder won't fire twice per cycle, so manual triggering during dev is safe.
- LLM-generated product URLs are NOT verified — the model can hallucinate. The eBay fallback is the only path for guaranteed-real URLs. UI labels saved products with their `source` (`AI` vs `Manual`) so the user knows.
- `app/people/page.tsx` is the **list page only**; person detail is `app/people/[id]/page.tsx`. Wishlist + product UI lives in the detail page. Server actions are still in `app/people/actions.ts` and shared between both.
- `lib/people-queries.ts` holds the read queries (`listPeopleSummary`, `getPersonDetail`). Server actions in `app/people/actions.ts` only do writes; don't move them around without updating both pages.
- Photo uploads use `lib/storage.ts`. Default strategy is `local` (writes to `public/uploads/`, needs a Docker volume for persistence). Set `STORAGE_STRATEGY=base64` for serverless/Vercel deployments (stores the file as a `data:` URI in `photo_url`).
- The iCal feed is at `/api/ical/[token]`. The token is `users.ical_token` (a UUID). Resetting it invalidates old calendar subscriptions. Token must be non-null for the feed route to work — it is auto-generated on account creation via `defaultRandom()`.
- **Release Please:** If the release PR fails to open, check **Actions → Workflow permissions** (allow Actions to create PRs). If **`sync-main-to-development`** fails on push, branch protection may block `github-actions[bot]` from pushing to `Development`, or there is a merge conflict to resolve locally.
- **`changelog-archive`:** Pushes only when `CHANGELOG.md` changes on `Development`. The bot commit message includes `[changelog-archive]` so the job does not recurse. If **`github-actions[bot]`** cannot push to `Development`, allow it in branch protection (same as sync workflow).

## When something is unclear

Ask the user. Don't guess on locked decisions, schema changes, or anything affecting cost (AI calls, paid APIs).
