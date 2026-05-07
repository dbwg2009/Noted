---
name: GitHub release rules
description: When to cut releases, version bump rules, and release note format
type: feedback
originSessionId: 8cf213dd-502d-49ba-b859-563e9a338dea
---
A release MUST be cut for every push or PR that lands on main — no exceptions.

**Version bump rules:**
- `MAJOR` — ONLY when the user explicitly asks. Never bump major on your own initiative under any circumstances.
- `MINOR` — every completed phase (e.g. v1.4.0 for Phase 8)
- `PATCH` — every bug fix or non-phase change that lands on main (e.g. v1.3.1)

**Release note format:**
1. A short, plain-English summary paragraph (1-3 sentences, human-readable, no jargon)
2. A bullet list with more detail and technical specifics

Example:
```
This release adds shareable wishlist links, letting you send a read-only view of any person's wishlist to friends and family without them needing an account.

- New `wishlist_shares` table with UUID token, expiry presets (1 month / 3 months / 1 year / Never), and per-status visibility toggles
- Public `/share/[token]` route — no auth required, branded page with Noted header
- Share Wishlist section on person detail page: copy link, regenerate token, revoke, configure visibility
- Purchased and given items always hidden from shared views to preserve surprise
```

**Bug fixes in release notes:** mention the issue number (e.g. "fixes #42") but do not link the closed issue for non-bug releases.

**Why:** User wants a release history that's readable at a glance but also traceable for technical reference. Major versions are meaningful milestones set by the user, not automated.

**How to apply:**
- `gh release create vX.Y.Z --title "vX.Y.Z — <short title>" --notes "$(cat <<'EOF' ... EOF)" --latest`
- Check current version in `package.json` before deciding the next tag
- Always bump `package.json` version to match the new tag before committing
