---
name: Commit and changelog conventions
description: Commit format, CHANGELOG rules, and version bump timing
type: feedback
originSessionId: 8cf213dd-502d-49ba-b859-563e9a338dea
---
**Commit format:** Conventional commits with a type prefix, imperative subject, optional why-body.
- `feat:` — new feature or phase work
- `fix:` — bug fix
- `chore:` — version bumps, config, dependencies
- `docs:` — design docs, README, CHANGELOG only
- `refactor:` — code change, no behaviour change

Example:
```
feat: add wishlist share expiry presets

Expiry is stored as a timestamp; presets (1 month / 3 months / 1 year /
Never) are computed at save time so no cron cleanup is needed.
```

**CHANGELOG:** Update on every commit — no exceptions, including typo fixes and chores.

**`package.json` version:** Do **not** bump manually. **Release Please** updates `"version"` on its release PR to `main` (see `CLAUDE.md` → Versioning). If the manifest drifts after an out-of-band release, fix `.github/release-please-manifest.json` to match the latest shipped tag — do not preemptively bump `package.json` on feature branches.

**CHANGELOG compaction:** When `CHANGELOG.md` exceeds **300 lines**, **`changelog-archive.yml`** opens a PR on **`Development`** that moves oldest dated entries to **`CHANGELOG-legacy.md`** (merge after CI). Locally: **`node scripts/compact-changelog.mjs`**. If one entry is enormous or automation stalls, flag the user — do not delete history silently.

**Why:** One source of truth for semver on `main` avoids fighting Release Please. CHANGELOG stays human-authored; GitHub Release bodies from Release Please are separate.

**How to apply:**
- Every commit: update `CHANGELOG.md` first, then commit with the right prefix
- If CHANGELOG is approaching 300 lines, flag it before the next commit
