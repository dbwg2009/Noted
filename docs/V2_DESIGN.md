# V2 Design — Noted

V1 shipped all planned phases (0–5). V2 adds five new phases that extend the app without breaking existing data or workflows. Read `DESIGN.md` and `DECISIONS.md` before implementing any phase here.

---

## V2 Phases at a glance

| Phase | Name | Version | Status | GitHub Milestone |
|-------|------|---------|--------|-----------------|
| 6 | Other Occasions | `v1.2.0` | **done** | Phase 6: Other Occasions |
| 7 | Shareable Wishlists | `v1.3.0` | **done** | Phase 7: Shareable Wishlists |
| 8 | Group Gifts | `v1.4.0` | **pending** | Phase 8: Group Gifts |
| 9 | Price-Drop Alerts | `v1.5.0` | **pending** | Phase 9: Price-Drop Alerts |
| 10 | Browser Extension | `v1.6.0` | **pending** | Phase 10: Browser Extension |

Implement phases in order. Each builds on the data layer of the previous. Do not skip phases without explicit user approval.

---

## Phase 6 — Other Occasions

**Goal:** Extend gift tracking beyond birthdays to anniversaries, Christmas, Mother's/Father's Day, and custom dates. Birthday data on `Person` stays as-is; occasions are additive.

### What to build
- A new `occasions` table for non-birthday gift occasions.
- Per-occasion reminders using the existing reminders system.
- Dashboard and calendar updated to surface upcoming occasions.
- Person detail page shows the person's occasions alongside their birthday.

### Schema changes (`db/schema.ts`)

```ts
// new enum
export const occasionKindEnum = pgEnum('occasion_kind', [
  'anniversary',
  'christmas',
  'mothers_day',
  'fathers_day',
  'valentines',
  'easter',
  'custom',
]);

// new table
export const occasions = pgTable('occasions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personId: integer('person_id').references(() => people.id, { onDelete: 'cascade' }), // nullable: e.g. Christmas shopping list not tied to one person
  kind: occasionKindEnum('kind').notNull(),
  name: text('name'),           // required when kind = 'custom'
  date: date('date').notNull(), // yyyy-mm-dd; year is the anchor (e.g. 2024-12-25); repeated yearly like birthdays
  yearRecurring: boolean('year_recurring').notNull().default(true), // false = one-off
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('occasions_user_id_idx').on(t.userId),
  index('occasions_person_id_idx').on(t.personId),
]);
```

Add `occasionId` (nullable integer FK to `occasions`) to the `reminders` table so reminders can be tied to an occasion rather than only to a birthday.

### Reminder system changes (`lib/reminders.ts`)
- `ensureDefaultReminders` must also create 30/14/7/1-day reminders for each `occasion`.
- `findDueReminders` must JOIN `occasions` and resolve the next occurrence date (same yearly-recurrence maths as birthdays in `lib/birthdays.ts`).
- `buildShortlist` should accept an occasion context (for the email subject line: "Christmas gift shortlist for Mum").

### UI changes
- **Dashboard (`app/page.tsx`):** Show upcoming occasions in the "upcoming" panel alongside birthdays.
- **Calendar (`app/calendar/page.tsx`):** Render occasion badges on their dates (use a distinct colour/icon per kind).
- **Person detail (`app/people/[id]/page.tsx`):** Add an "Occasions" section with add/edit/delete for that person's occasions.
- **Occasion icons:** use Heroicons — `GiftIcon` (birthday), `HeartIcon` (anniversary/valentines), `StarIcon` (christmas), `SparklesIcon` (custom), etc.

### New files
- `lib/occasions-queries.ts` — `listUpcomingOccasions(userId)`, `getOccasionsForPerson(personId)`.
- `app/people/occasion-actions.ts` — `createOccasion`, `updateOccasion`, `deleteOccasion` server actions.

### Key files to modify
- `db/schema.ts` — add enum + table + FK on `reminders`.
- `lib/reminders.ts` — extend for occasions.
- `lib/birthdays.ts` (or new `lib/occasions.ts`) — `daysUntilOccasion`, `nextOccurrenceDate` helpers.
- `app/page.tsx`, `app/calendar/page.tsx`, `app/people/[id]/page.tsx`.

### Implementation notes
- The year in `occasions.date` is just the anchor; treat all occasions as yearly-recurring unless `yearRecurring = false`.
- "Christmas" occasions with `personId = NULL` represent a general shopping list (not tied to one person). Handle this edge case in the dashboard/calendar by showing it as a user-level event.
- Run `npm run db:push` after schema changes.

---

## Phase 7 — Shareable Wishlists

**Goal:** Let a user generate a read-only public link to a person's wishlist, shareable with family without requiring an account. Purchased/given items are hidden to preserve the surprise.

### What to build
- A `wishlist_shares` table with a secret token.
- A public route `/share/[token]` that requires no login.
- A "Share wishlist" button on the person detail page.

### Schema changes

```ts
export const wishlistShares = pgTable('wishlist_shares', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  token: uuid('token').notNull().unique().defaultRandom(),
  label: text('label'),              // e.g. "Shared with Mum"
  expiresAt: timestamp('expires_at'), // null = never
  showPrices: boolean('show_prices').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('wishlist_shares_person_id_idx').on(t.personId),
]);
```

### New route: `app/share/[token]/page.tsx`
- No auth middleware — this page must be excluded from `middleware.ts` matcher.
- Fetch the share record by token; 404 if missing or expired.
- Render person name, wishlist items (filter: exclude status `purchased` and `given`).
- If `showPrices = false`, hide price fields.
- Show linked products (AI badge, retailer, buy link) for items in `researching` / `chosen` status.
- No edit controls — read-only.

### UI changes (person detail page)
- "Share wishlist" section: list existing shares (label, expiry, revoke button), "Create new share link" form.

### New server actions
- `createWishlistShare(personId, label, expiresAt, showPrices)` → returns token.
- `revokeWishlistShare(shareId)`.
- `listWishlistShares(personId)`.

### Key files to modify
- `db/schema.ts` — add table.
- `middleware.ts` — exclude `/share/` from the auth matcher.
- `app/people/[id]/page.tsx` — add sharing UI section.
- `app/people/actions.ts` or new `app/people/share-actions.ts`.

### Implementation notes
- The share token is the only secret. Treat it like the iCal token — UUID, no brute-force surface.
- The public page should set `Cache-Control: no-store` so stale data doesn't show.
- Expiry check: compare `expiresAt` with `new Date()` server-side before rendering.

---

## Phase 8 — Group Gifts

**Goal:** Coordinate a group purchase — track contributors, amounts, and payment status for a single gift split across multiple people.

### What to build
- A `gift_groups` table and a `gift_group_contributors` table.
- UI on the wishlist item to "Create group gift" — converts an item into a tracked group purchase.
- An optional contribution link so other contributors can log their share (Phase 7's share mechanism can be extended, or a simpler email-based flow).

### Schema changes

```ts
export const giftGroupStatusEnum = pgEnum('gift_group_status', ['planning', 'ordered', 'received']);

export const giftGroups = pgTable('gift_groups', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  personId: integer('person_id').references(() => people.id, { onDelete: 'set null' }),
  wishlistItemId: integer('wishlist_item_id').references(() => wishlistItems.id, { onDelete: 'set null' }),
  occasionId: integer('occasion_id').references(() => occasions.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  targetAmount: integer('target_amount'),     // pence; null = no fixed target
  status: giftGroupStatusEnum('status').notNull().default('planning'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('gift_groups_user_id_idx').on(t.userId),
]);

export const giftGroupContributors = pgTable('gift_group_contributors', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => giftGroups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  contributionAmount: integer('contribution_amount'),   // pence; null = TBD
  paid: boolean('paid').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('gift_group_contributors_group_id_idx').on(t.groupId),
]);
```

### UI
- `/gift-groups` — list of all active group gifts.
- `/gift-groups/[id]` — detail: contributors list, total raised vs target, status controls.
- Wishlist item detail: "Create group gift" button → opens create form pre-filled with item title + budget.
- Progress bar: amount raised / target.

### New files
- `app/gift-groups/` — list + detail pages.
- `app/gift-groups/actions.ts` — server actions: `createGiftGroup`, `updateGiftGroup`, `addContributor`, `updateContributor`, `deleteContributor`.

### Implementation notes
- For MVP (Phase 8), contribution coordination is manual — user records amounts themselves. No payment processing.
- A future extension could generate a share link (like Phase 7) where contributors self-log their amount.
- `targetAmount` null means the group is informal (no fixed budget). UI hides the progress bar in that case.

---

## Phase 9 — Price-Drop Alerts

**Goal:** Watch a saved product for price changes and email the user when the price drops below a set threshold.

### What to build
- A `price_alerts` table linked to `products`.
- A daily cron job that checks prices via eBay Browse API (or re-runs the LLM search).
- An email alert via Resend when the price drops.

### Schema changes

```ts
export const priceAlertStatusEnum = pgEnum('price_alert_status', ['active', 'triggered', 'paused', 'dismissed']);

export const priceAlerts = pgTable('price_alerts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  targetPrice: integer('target_price').notNull(),    // pence; alert when price <= this
  lastKnownPrice: integer('last_known_price'),        // pence
  lastCheckedAt: timestamp('last_checked_at'),
  triggeredAt: timestamp('triggered_at'),
  status: priceAlertStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('price_alerts_user_id_idx').on(t.userId),
  index('price_alerts_product_id_idx').on(t.productId),
]);
```

### Price checking strategy
- Only eBay-sourced products can be reliably re-checked (they have real eBay item IDs in `raw_payload`).
- AI-sourced products: fallback to re-running the eBay search by title and comparing cheapest result.
- Logic lives in `lib/products/price-check.ts`.

### Cron extension (`app/api/cron/reminders/route.ts` or new `app/api/cron/price-alerts/route.ts`)
- New endpoint `POST /api/cron/price-alerts` — protected by same `CRON_SECRET`.
- Checks all `active` price alerts: fetch current price → compare → if `currentPrice <= targetPrice`, send email + set `status = 'triggered'`.
- `cron` Docker Compose service pings both endpoints daily.

### Email
- Extend `lib/notify/email.ts` with a `sendPriceAlert(user, product, currentPrice, targetPrice)` function.
- Simple template: "Good news — [Product name] has dropped to £X (your target was £Y). Buy now: [link]."

### UI
- Product card in wishlist item detail: "Watch price" button → sets target price (defaults to current price - 10%).
- Person detail shows a small bell icon on watched products.
- `/settings` page: "Price alerts" section listing all active watches with pause/dismiss controls.

### Key files to create/modify
- `lib/products/price-check.ts` — new.
- `app/api/cron/price-alerts/route.ts` — new.
- `lib/notify/email.ts` — add price alert email.
- `app/people/actions.ts` — add `createPriceAlert`, `dismissPriceAlert`.
- `docker-compose.yml` — add second cron call or extend cron service script.

### Implementation notes
- Only trigger the alert once per drop event (`status = 'triggered'`). User must re-activate manually.
- Rate-limit: check at most 10 products per cron run to avoid eBay API rate limits.
- If eBay returns no results for a product, skip (don't trigger a false alert).

---

## Phase 10 — Browser Extension

**Goal:** Right-click on a product page in Chrome/Firefox → save it directly to a person's Noted wishlist without copying URLs manually.

### What to build
1. A REST API endpoint on the Noted app for external writes.
2. A Chrome/Firefox extension (Manifest V3) with a popup.

### API endpoint
New route: `POST /api/v1/wishlist-items`
- Auth: API key in `Authorization: Bearer <key>` header (not session-based — extensions can't use cookies reliably).
- Body: `{ personId, description, url, title, imageUrl?, price?, retailer? }`.
- Returns: `{ wishlistItemId, productId }`.

### API key management
```ts
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull().unique(),  // bcrypt hash of the raw key
  label: text('label').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('api_keys_user_id_idx').on(t.userId),
]);
```

- Raw key shown once at creation (format: `nk_<uuid>`); only the hash is stored.
- UI in `/settings` to create/revoke keys.

### Browser extension (`/browser-extension/`)
Structure:
```
/browser-extension
  manifest.json      MV3
  popup.html         small popup UI
  popup.js           fetch person list from API, submit item
  content.js         scrapes page: title, price, image, URL
  background.js      handles right-click context menu
  icons/             16, 48, 128 px
```

Content script scrapes Open Graph / JSON-LD / meta tags for product info. Popup lets user pick a person and confirm. Extension stores the API key + base URL in `chrome.storage.local`.

### Key files to create
- `app/api/v1/wishlist-items/route.ts`
- `lib/api-key.ts` — `createApiKey`, `verifyApiKey`, `revokeApiKey`.
- `app/settings/api-keys/page.tsx` and server actions.
- `/browser-extension/` directory (separate from Next.js app).

### Implementation notes
- The extension is distributed as a `.zip` / `.crx` from the GitHub Releases page, not through the Chrome Web Store (personal tool, not worth the $5 developer fee).
- The API base URL must be configured in the extension popup settings (e.g. `https://noted.yourdomain.com`).
- CORS: add `Access-Control-Allow-Origin: *` only to the `/api/v1/` routes, not the whole app.
- Phase 10 can be worked on independently of Phase 9 once Phase 7 is done (no hard dependency on Phase 8 or 9).

---

## V2 Data model delta (full summary)

New tables (in dependency order):
1. `occasions` (Phase 6)
2. `wishlist_shares` (Phase 7)
3. `gift_groups`, `gift_group_contributors` (Phase 8)
4. `price_alerts` (Phase 9)
5. `api_keys` (Phase 10)

Modified tables:
- `reminders`: add `occasion_id` nullable FK (Phase 6).

New enums:
- `occasion_kind` (Phase 6)
- `gift_group_status` (Phase 8)
- `price_alert_status` (Phase 9)

---

## Environment variables required for V2

| Variable | Phase | Purpose |
|----------|-------|---------|
| No new env vars for Phase 6 | — | Uses existing Resend + OpenRouter |
| No new env vars for Phase 7 | — | Token-based, no external service |
| No new env vars for Phase 8 | — | Local state only |
| No new env vars for Phase 9 | — | Uses existing eBay + Resend |
| `NOTED_BASE_URL` | 10 | Used in API response headers + extension config docs |

---

## Release tagging for V2

| Tag | Phase completed |
|-----|----------------|
| `v2.0.0` | Phase 6 — Other Occasions |
| `v2.1.0` | Phase 7 — Shareable Wishlists |
| `v2.2.0` | Phase 8 — Group Gifts |
| `v2.3.0` | Phase 9 — Price-Drop Alerts |
| `v2.4.0` | Phase 10 — Browser Extension |

---

## For AI agents picking up V2 work

1. Read `CLAUDE.md`, `DESIGN.md`, and `DECISIONS.md` first.
2. Find the first phase in the table above that is still **pending**.
3. Implement only that phase. Do not implement later phases speculatively.
4. After implementing: run `npm run db:push`, ensure TypeScript compiles (`npx tsc --noEmit`), smoke-test in Docker.
5. Update the phase's **Status** in this file from `pending` → `done`.
6. Add a `CHANGELOG.md` entry before committing.
7. After merging to `main`, cut a GitHub release at the tag listed in the release table above.
8. Ask the user before starting the next phase.
