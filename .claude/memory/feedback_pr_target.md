---
name: PR target branch
description: Always open PRs against Development, never main
type: feedback
---

Always PR to the **Development** branch for testing, never directly to main. The user reviews changes on Development and promotes to main themselves when happy.

**Why:** User wants to test on Development first and suggest changes before anything lands on main.

**How to apply:** On every `gh pr create`, always pass `--base Development`. Never use `--base main`.
