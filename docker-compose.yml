# Decisions Log

Locked decisions from the planning round. See `DESIGN.md` for the full design these flow into.

## A. Foundations
| # | Question | Decision |
|---|----------|----------|
| A1 | Single-user or multi-user? | **Single-user** (auth scaffolding still in place) |
| A2 | Reminder channel | **Email** (Resend) |
| A3 | Country / currency | **UK / GBP**, locale `en-GB`, timezone `Europe/London` |
| A4 | Tech stack | **Next.js 15 + TS + Postgres (Neon) + Tailwind + Vercel** |
| A5 | Cost appetite | **£0/mo target.** Use Gemini's free Google Search grounding instead of paid SerpAPI; eBay Browse API (free) as fallback; Resend free tier; Vercel + Neon free tiers. |

## B. Defaults
| # | Question | Decision |
|---|----------|----------|
| B6 | LLM | **Gemini** (user-supplied API key, free tier) |
| B7 | Reminder lead times | **30 / 14 / 7 / 1 days** before |
| B8 | Gift history tracking | **Yes** |
| B9 | Occasions in v1 | **Birthdays only** (schema designed so other occasions slot in later) |
| B10 | Photos for people | **Nice-to-have** — defer to Phase 5 polish |

## C. Deferred
| # | Question | Decision |
|---|----------|----------|
| C11 | Group gifts | **v2** |
| C12 | Calendar export / sync | **Interested** — slate for Phase 5 (iCal feed URL is cheap) |
| C13 | Browser extension | **Later** — not v1 |
| C14 | Encryption at rest | **Trust DB provider** (Neon) — no extra app layer |
| C15 | Affiliate links | **No** — keep links clean |

## D. Confirmed-in features
- Sizes per person ✓
- Notes per person ✓
- Source notes on wishlist items ✓
- Status workflow (idea → researching → chosen → purchased → given) ✓
- Reaction notes on gift history ✓
- Tags (kept — used by AI suggestions; small, optional)
- Allergies / "things to avoid" (kept — same `avoid` field)
- In-stock flag on saved products (kept — populated when available)
- Multiple budgets per person — **out** for v1 (one budget range per person)

## E. Confirmed-out (v1)
- Multi-user / shared wishlists
- Auto-purchasing
- Native mobile app
- Price-drop watching
- Social / discovery features
- Group gifts
- Affiliate link rewriting
- Browser extension
- Other occasions (anniversaries, Christmas, etc.)
