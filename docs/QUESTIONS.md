# Open Questions

Answer these (even with "you decide") and we can start building. Grouped by importance.

---

## A. Must answer before we start

1. **Just you, or multi-user?**
   v1 plan is single-user (you log in, only you see your data). Auth is still scaffolded so we *can* add others later. OK?

2. **Reminder channel.** Pick one or more:
   - [ ] Email (recommended default — Resend, free tier)
   - [ ] Telegram bot (free, reliable, good if you use Telegram)
   - [ ] Web push (only fires when browser is open / PWA installed)
   - [ ] SMS (costs money per message, Twilio)
   - [ ] In-app only (no push at all)

3. **Country / currency.** Where are you mostly shopping?
   (Affects which product search providers + currency defaults.)

4. **Tech stack OK?**
   Default proposal: Next.js + TypeScript + Postgres + Tailwind + Vercel. Yes / suggest changes / "you pick".

5. **Hosting / cost appetite.**
   - Vercel + Neon free tiers will likely cover this.
   - SerpAPI is ~$50/mo at the smallest paid tier (free trial = 100 searches). Are you OK with that, or should we start Amazon-only / manual-only and add product search later?
   - Claude API will be pay-as-you-go — likely under $5/mo for personal use with caching.

---

## B. Important, but I have a default if you don't care

6. **AI spend cap.** Default: hard stop at $10/mo. OK or different number?

7. **Default reminder lead times.** Default: 30, 14, 7, 1 days before. OK?

8. **Gift history tracking.** Default: yes, on by default — we record everything you mark as "given" so AI can avoid repeats. OK?

9. **Occasions beyond birthdays.** Two options:
   - (a) Birthdays only for v1, add others in v2 (faster to build).
   - (b) Generic "Occasion" model from day one (Christmas, anniversaries, etc.) — slightly more schema work upfront.
   My recommendation: **(a)**, but design the schema so (b) is easy.

10. **Photos for people.** Nice-to-have or must-have for v1?

---

## C. Nice to clarify, can defer

11. **Group gifts** (you split a gift with siblings/friends) — need this in v1, or v2?

12. **Calendar export / Google Calendar sync** — interested?

13. **Browser extension** ("right-click → save to wishlist") — interested longer-term?

14. **Encryption at rest for notes/avoid fields** — worth the complexity, or trust the DB provider's encryption?

15. **Affiliate links** — do you want product links rewritten with your Amazon Associates tag (small revenue) or kept clean?

---

## D. Things you might have forgotten — confirm in/out

- [ ] **Sizes** (clothing, shoe, ring) per person
- [ ] **Allergies / things to avoid** per person
- [ ] **Tags** ("gamer", "reader") for AI suggestions
- [ ] **Notes** field per person (stuff like "loves dark chocolate, hates surprises")
- [ ] **Source note** on wishlist items ("said this at brunch on 2026-03-12")
- [ ] **Status workflow** on wishlist items: idea → researching → chosen → purchased → given
- [ ] **Reaction notes** after a gift is given (helps future suggestions)
- [ ] **In-stock flag** on saved products
- [ ] **Multiple budgets** per person (everyday vs. milestone birthday)

Mark any you don't want, and add anything missing.

---

## E. Out-of-scope for v1 (confirm OK to defer)

- Multi-user / shared wishlists
- Auto-purchasing
- Native mobile app (web responsive instead)
- Price-drop watching
- Social / discovery features

---

When you're back, just answer **A1–A5** at minimum and we can start Phase 0.
