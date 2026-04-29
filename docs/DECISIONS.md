# Decisions Log

Locked decisions from the planning round. See `DESIGN.md` for the full design these flow into.

## A. Foundations
| # | Question | Decision |
|---|----------|----------|
| A1 | Single-user or multi-user? | **Single-user** (auth scaffolding still in place) |
| A2 | Reminder channel | **Email** (Resend) |
| A3 | Country / currency | **UK / GBP**, locale `en-GB`, timezone `Europe/London` |
| A4 | Tech stack | **Next.js 15 + TS + Postgres (Neon) + Tailwind + Vercel** |
| A5 | Cost appetite | **£0/mo target.** OpenRouter free-tier LLM (originally Gemini grounding — see change log); eBay Browse API (free) as fallback; Resend free tier; Vercel + Neon free tiers (or Docker on a Pi). |

## B. Defaults
| # | Question | Decision |
|---|----------|----------|
| B6 | LLM | **OpenRouter** via OpenAI-compatible REST. Default model `meta-llama/llama-3.3-70b-instruct:free` (overridable via `OPENROUTER_MODEL`). Switched from Gemini after Phase 2 — see Change log below. |
| B7 | Reminder lead times | **30 / 14 / 7 / 1 days** before |
| B8 | Gift history tracking | **Yes** |
| B9 | Occasions in v1 | **Birthdays only** (schema designed so other occasions slot in later) |
| B10 | Photos for people | **Nice-to-have** — defer to Phase 5 polish |

## Change log

- **LLM provider: Gemini → OpenRouter** (post-Phase 2). Reason: user preference + OpenRouter aggregates many free models behind one OpenAI-compatible API. Trade-off: lost Gemini's free Google Search grounding, so LLM-suggested product URLs can be hallucinated. Mitigation: eBay Browse API stays as the trusted-URL fallback, and saved products are tagged `ai_search` vs `manual` so the user knows which is which.
- **UI structure: single `/people` page → multi-page** (post-Phase 2). Added `/` (dashboard with upcoming birthdays + stats), `/calendar` (month grid view), `/people` (card grid), `/people/new` (clean add form), `/people/[id]` (detail page with wishlist/products/settings). Shared top nav, avatars, status pills, countdown badges in `components/`.

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
