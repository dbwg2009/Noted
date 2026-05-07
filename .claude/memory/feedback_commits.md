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

**Version bump (`package.json`):** Bump just before opening a PR to Development — as the final commit on the feature branch. The version reflects what is about to ship, so by the time the PR lands on main and the release is cut, the tag and `package.json` version already match.

**CHANGELOG compaction:** When `CHANGELOG.md` exceeds ~300 lines, move entries older than the last major version into `CHANGELOG-legacy.md`. Flag this to the user before doing it — never silently archive.

**Why:** Version in `package.json` should always reflect the work about to land, not what was last released. CHANGELOG kept short to avoid bloating the AI context window.

**How to apply:**
- Every commit: update `CHANGELOG.md` first, then commit with the right prefix
- Pre-PR commit: bump `"version"` in `package.json`, add a `chore: bump version to X.Y.Z` commit
- If CHANGELOG is approaching 300 lines, flag it before the next commit
