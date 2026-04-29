# Birthday Gift Finder

A personal web app to track friends' and family members' birthdays, manage gift ideas, and use AI to find products online (with prices + links), suggest gifts, and remind you before birthdays.

> Status: **Phase 0 complete** (scaffolding + Docker stack). Phase 1 (people + wishlist CRUD) is next. See `docs/DESIGN.md` for the design, `docs/DECISIONS.md` for locked decisions, and `CLAUDE.md` if you're an AI agent picking this up.

## At a glance

- **People list** with birthdays, relationship, budget, notes, sizes/allergies, gift history
- **Wishlist per person** — free-text things they've said they want
- **AI product lookup** — turn wishlist items into real products with price + buy links
- **AI gift suggestions** based on wishlist + interests + budget
- **Manual entry** fallback for everything AI does
- **Reminders** ahead of each birthday, with budget-aware suggestions

## Stack

Next.js 15 (App Router) · TypeScript · Postgres (Neon) · Drizzle · Auth.js (email magic link) · Tailwind + shadcn/ui · Gemini (with Google Search grounding) · Resend (email reminders) · Vercel.

## Local dev

### Option A: Docker (recommended)

Brings up the app + a Postgres container. Schema migrations run automatically.

```bash
cp .env.example .env         # fill in AUTH_SECRET, RESEND_API_KEY, ALLOWED_EMAIL, GEMINI_API_KEY
# (DATABASE_URL is set by docker-compose itself — leave it blank in .env)

docker compose up --build -d
# starts: db → migrate (one-shot, applies schema) → app
# open http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

To re-apply schema later (after schema changes), the `migrate` service runs again on every `docker compose up`.

### Option B: Native Node

```bash
cp .env.example .env.local   # fill in everything, including DATABASE_URL
npm install
npm run db:push
npm run dev
```

Required env vars are listed in `.env.example`.
