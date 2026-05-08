---
name: PR workflow
description: Full rules for opening, merging, releasing, and cleaning up PRs on this project
type: feedback
originSessionId: 8cf213dd-502d-49ba-b859-563e9a338dea
---
**When to open a PR:**
- Do NOT open a PR unless the user explicitly says to. When in doubt, ask first.

**Feature branch → Development PRs (ongoing work):**
- I open the PR (only when told) with full description using the template (what, why, changes, testing checklist, notes)
- Always `--base Development`, never main
- Always assign dbwg2009, relevant labels, and milestone
- Always reference the related issue in the body (`Closes #N`)
- Post a progress comment on the issue when the PR is opened
- After opening, wait for bot comments to appear on the PR (e.g. Release Please, Codecov, Socket Security), then read them all
- If any bot flags issues or suggests changes, address them and push fixes
- After addressing, re-read the PR comments to confirm no outstanding issues remain
- Then prompt the user to review the PR
- I can merge feature → Development PRs once the user has reviewed and approved

**Development → main PRs (phase completion):**
- Only opened when the user says they are happy with a phase and it can go to main
- I open the PR, fill the template, assign everything
- Wait for the user to merge it themselves — I do not merge Development → main
- After the user confirms they've merged it, I:
  1. Create a new GitHub release (tag format `vMAJOR.MINOR.PATCH`, `--latest`)
  2. Close the related issue
  3. Close the corresponding milestone (`gh api repos/dbwg2009/Noted/milestones/<n> -X PATCH -f state=closed`)
  4. Delete stray feature branches (keep Development and main)

**Why:** User reviews on Development and promotes to main when satisfied. Releases and cleanup only happen after the merge lands on main.

**How to apply:**
- `gh pr create --base Development --assignee dbwg2009 --label "..." --milestone "..." --body "$(cat <<'EOF' ... EOF)"`
- `gh pr create --base main` only for the final Dev→main promotion PR
- `gh release create vX.Y.Z --title "..." --notes "..." --latest` after user confirms merge
- `gh issue close N` and `git push origin --delete <branch>` after release is cut
