# Noted

<p align="center">
  <img src="public/logo/full.png" alt="Noted" width="320" />
</p>

A personal, AI-powered gift planning and birthday tracking application.

> Status: **Phases 0–5 complete** (Rebranded to Noted, Photo Uploads, iCal Sync, AI Gift Suggestions, Email Reminders). See `docs/DESIGN.md` for the full architecture.

## Key Features

- **Dashboard:** Upcoming birthdays, quick stats, and **Calendar Sync (iCal)**.
- **Photo Uploads:** Upload photos for your people directly (saves to local volume or Base64).
- **Calendar View:** Month-grid showing all birthdays, optimized for mobile.
- **Wishlist:** Manage ideas with a full status workflow (idea → research → chosen → given).
- **AI Product Lookup:** Find real UK products within your **strict budget** using OpenRouter AI.
- **eBay Fallback:** Reliable product links and prices from eBay UK.
- **AI Suggestions:** Thoughtful gift ideas based on the person's interests and history.
- **Email Reminders:** Automatic digests sent via Resend at 30, 14, 7, and 1 day before.

## Quick Start (Docker)

The fastest way to run Noted is using pre-built images — no clone required.

### 1. Download the two config files

```bash
curl -O https://raw.githubusercontent.com/dbwg2009/Noted/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/dbwg2009/Noted/main/.env.example
mv .env.example .env
```

Or with `wget`:
```bash
wget https://raw.githubusercontent.com/dbwg2009/Noted/main/docker-compose.yml
wget -O .env https://raw.githubusercontent.com/dbwg2009/Noted/main/.env.example
```

### 2. Fill in your `.env`

The required keys are:

| Key | Where to get it |
|-----|----------------|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ALLOWED_EMAIL` | Optional — only used for magic-link single-user mode; not required for password-based multi-user setups |
| `RESEND_API_KEY` | [resend.com](https://resend.com) — free tier is fine |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) — free tier is fine |
| `CRON_SECRET` | `openssl rand -hex 32` |

### 3. Run

```bash
docker compose up -d
```

Images are pulled from Docker Hub automatically. The `migrate` service applies the schema before the app starts — just open http://localhost:3000.

### 4. Build Locally (Development)
If you need to make code changes:
```bash
git clone https://github.com/dbwg2009/Noted.git && cd Noted
docker compose up --build -d
```

## Calendar Sync (iCal)
Find your unique iCal URL at the bottom of the Dashboard. Copy and paste it into:
- Google Calendar (Add by URL)
- Apple Calendar (New Calendar Subscription)
- Outlook (Add Calendar -> From Internet)

## Tech Stack
Next.js 15 · TypeScript · Postgres (Drizzle) · Auth.js · Tailwind · OpenRouter AI · eBay API · Resend · Docker.
