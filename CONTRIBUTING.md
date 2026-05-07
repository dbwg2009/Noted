# Contributing to Noted

Thanks for your interest in contributing. This is a personal project with a deliberate build order — please read this before opening a PR.

## Before you start

- Check the [open issues](https://github.com/dbwg2009/Noted/issues) and [project board](https://github.com/users/dbwg2009/projects/4) to see what's planned or in progress.
- For anything beyond a small bug fix, open an issue first and wait for a response before writing code. This avoids duplicate effort and keeps the build phases in order.
- For security vulnerabilities, see [SECURITY.md](SECURITY.md) — do not open a public issue.

## Dev setup

```bash
# Clone and install
git clone https://github.com/dbwg2009/Noted.git
cd Noted
npm install

# Copy env and fill in values
cp .env.example .env.local

# Run with Docker (recommended — matches production)
docker compose up --build -d

# Or run natively
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Branch and commit rules

- Branch from `Development`, never from `main`
- Name your branch descriptively: `fix-share-url`, `phase-8-group-gifts`
- Use [conventional commits](https://www.conventionalcommits.org):
  - `feat:` — new feature
  - `fix:` — bug fix
  - `chore:` — dependency updates, config
  - `docs:` — documentation only
  - `refactor:` — code change with no behaviour change
- Update `CHANGELOG.md` in every commit

## Pull requests

- All PRs target `Development`, never `main`
- Fill in the PR template fully — what, why, changes, testing
- Reference the related issue (`Closes #N`)
- Ensure TypeScript and ESLint checks pass (`npx tsc --noEmit && npm run lint`)
- PRs that skip the issue step or target `main` directly will be closed

## Code style

- TypeScript strict — no `any`, no type assertions without a comment explaining why
- No comments unless the WHY is non-obvious — code should be self-documenting
- Money stored as integer pence, never floats
- All DB writes through Drizzle ORM — no raw SQL
- Server actions for mutations; avoid new REST routes unless necessary
