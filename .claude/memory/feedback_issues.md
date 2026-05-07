---
name: GitHub issue workflow
description: Rules for opening, updating, and closing GitHub issues on this project
type: feedback
---

Either the user or I can open issues. Every piece of work gets an issue unless the user says otherwise.

Use the GitHub issue templates (Feature for phases/enhancements, Bug for breaks) — they pre-assign dbwg2009 and pre-apply the right label.

Labels: apply at discretion based on context (bug, enhancement, phase, stretch, etc.).

Always post progress comments to keep the issue up to date — never go silent mid-task.

Never close an issue without the user's explicit sign-off.

**Why:** User wants full traceability and to stay in control of when work is considered done.

**How to apply:**
- `gh issue create --assignee dbwg2009 --label "..." --milestone "..."` (or use template via GitHub UI)
- `gh issue comment <n> --body "..."` for every meaningful progress step
- Only run `gh issue close` after the user confirms satisfaction
