# Birthday Gift Finder

A personal web app to track friends' and family members' birthdays, manage gift ideas, and use AI to find products online (with prices + links), suggest gifts, and remind you before birthdays.

> Status: **Phases 0–2 complete** (scaffolding, Docker, people + wishlist CRUD, AI product lookup). Phase 3 (suggestions + gift history) is next. See `docs/DESIGN.md` for the design, `docs/DECISIONS.md` for locked decisions, and `CLAUDE.md` if you're an AI agent picking this up.

## At a glance

- **Dashboard** with upcoming birthdays at a glance
- **Calendar view** — month grid showing all your people's birthdays
- **People** with photos, birthdays, relationship, budgets, sizes, tags, notes
- **Wishlist per person** — free-text + status workflow (idea → researching → chosen → purchased → given)
- **AI product lookup** via OpenRouter — turn wishlist items into product candidates
- **eBay fallback** for real product URLs and prices (free Browse API)
- **Manual entry** fallback for everything AI does
- **Reminders** ahead of each birthday (Phase 4)

## Stack

Next.js 15 (App Router) · TypeScript · Postgres · Drizzle · Auth.js (email magic link) · Tailwind · OpenRouter (LLM) · eBay Browse API · Resend (email) · Docker (primary) / Vercel + Neon (alt).

## Local dev

### Option A: Docker (recommended)

Brings up the app + a Postgres container. Schema migrations run automatically.

```bash
cp .env.example .env   # fill in AUTH_SECRET, RESEND_API_KEY, ALLOWED_EMAIL, OPENROUTER_API_KEY
# (DATABASE_URL is set by docker-compose itself — leave it blank in .env)

docker compose up --build -d
# starts: db → migrate (one-shot, applies schema) → app
# open http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

The `migrate` service runs on every `docker compose up`, so schema changes are applied automatically.

### Option B: Native Node

```bash
cp .env.example .env.local   # fill in everything, including DATABASE_URL
npm install
npm run db:push
npm run dev
```

Required env vars are listed in `.env.example`.
