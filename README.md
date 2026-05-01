# Noted

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

The fastest way to run Noted is using pre-built images.

### 1. Setup Environment
```bash
cp .env.example .env
# Fill in AUTH_SECRET, RESEND_API_KEY, ALLOWED_EMAIL, OPENROUTER_API_KEY
```

### 2. Run with Docker Hub Images (Recommended)
This avoids slow local builds, especially on Raspberry Pi.

```bash
# Pull the latest images
docker compose pull

# Start the application
docker compose up -d
```

### 3. Build Locally (Development)
If you need to make code changes:
```bash
docker compose up --build -d
```

## Calendar Sync (iCal)
Find your unique iCal URL at the bottom of the Dashboard. Copy and paste it into:
- Google Calendar (Add by URL)
- Apple Calendar (New Calendar Subscription)
- Outlook (Add Calendar -> From Internet)

## Tech Stack
Next.js 15 · TypeScript · Postgres (Drizzle) · Auth.js · Tailwind · OpenRouter AI · eBay API · Resend · Docker.
