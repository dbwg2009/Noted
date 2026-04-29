# Birthday Gift Finder

A personal web app to track friends' and family members' birthdays, manage gift ideas, and use AI to find products online (with prices + links), suggest gifts, and remind you before birthdays.

> Status: **scaffolding** (Phase 0). See `docs/DESIGN.md` for the design and `docs/DECISIONS.md` for locked decisions.

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

Brings up the app + a Postgres container.

```bash
cp .env.example .env         # fill in AUTH_SECRET, RESEND_API_KEY, ALLOWED_EMAIL, GEMINI_API_KEY
# (DATABASE_URL is set by docker-compose itself — leave it blank in .env)

docker compose up --build -d

# apply schema to the dockerised DB the first time:
docker compose exec app npx drizzle-kit push

# open http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

### Option B: Native Node

```bash
cp .env.example .env.local   # fill in everything, including DATABASE_URL
npm install
npm run db:push
npm run dev
```

Required env vars are listed in `.env.example`.
