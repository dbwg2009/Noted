---
name: Branch workflow
description: Branch naming, base branch, and stale branch handling
type: feedback
originSessionId: 8cf213dd-502d-49ba-b859-563e9a338dea
---
Every branch is tied to an issue — open the issue first, then create the branch from it.

**Naming:**
- Phase work: `phase-N-short-description` (e.g. `phase-8-group-gifts`)
- Bug fixes: decide the name based on the issue (e.g. `fix-share-url` or `fix/share-url`) — no rigid convention, just keep it descriptive

**Base branch:** Always branch from `Development` unless the user explicitly says otherwise. Never branch from `main`.

**Merging:** All branches PR into `Development`. Only `Development` ever PRs into `main`.

**No other branch types** — no `infra/`, `docs/`, `chore/` etc. Keep it simple.

**Stale branches:** Flag them and ask the user before deleting. Never delete a branch unilaterally unless it was just merged as part of the release cleanup checklist.

**Why:** Every piece of work is traceable to an issue. Branching from Development keeps main clean and stable.

**How to apply:**
- `git checkout -b phase-N-name origin/Development`
- `git checkout -b fix-description origin/Development`
- After spotting stale branches via `git branch -r`, list them and ask the user which to delete
- `git push origin --delete <branch>` only after user confirms or as part of post-release cleanup
