---
name: GitHub issue and PR management
description: How to open, label, assign, update, and close GitHub issues and PRs on this project
type: feedback
---

When opening a GitHub **issue**:
- Assign relevant **labels** (e.g. `enhancement`, `bug`, `phase`, `stretch`)
- Assign **dbwg2009** as the assignee
- Link to the relevant **milestone** if one exists
- Link to the relevant **branch** in the body if work is in progress

When opening a GitHub **PR**:
- Assign relevant **labels** (e.g. `enhancement` for new features, `bug` for fixes, `phase` for build-phase work, `done` when merged)
- Assign **dbwg2009** as the assignee
- Always target **Development**, never main
- Reference the related issue in the body

While work is in progress:
- Post **progress updates as comments** on the issue (e.g. "Started implementation", "PR opened at #X", "Schema applied", "Build fix pushed")

**Never close an issue** until the user explicitly says they are happy with it.

**Why:** User wants full traceability on both issues and PRs, and to stay in control of when issues are considered done.

**How to apply:**
- `gh issue create`: pass `--assignee dbwg2009`, `--label "..."`, `--milestone "..."`
- `gh pr create`: pass `--assignee dbwg2009`, `--label "..."`, `--milestone "..."`, `--base Development`
- `gh issue comment <n> --body "..."` for progress updates
- Only run `gh issue close` after the user confirms
