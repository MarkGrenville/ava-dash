# Ava Dashboard

A monitoring and task management dashboard that extends Claude Code's capabilities with structured project planning, scheduled tasks, and token usage tracking.

## What This Is

I run Claude Code locally on a Mac Mini as a bot called **Ava**. It handles tasks for me — research, web scraping, email responses, automation — but without any external system it operates as a black box. I have no visibility into what it's doing, whether it's stuck, how many tokens it's burning, or whether it remembered to follow up on something.

Ava Dashboard gives Claude Code a structured API to:

- **Organize work into projects with ordered tasks** — instead of treating every request as a single input/output, Ava can break complex work into multi-step plans and work through them progressively.
- **Schedule future tasks** — if I ask Ava to remind me about something on Friday, it can create a task with a specific execution time. A cron job checks every minute and activates tasks when they're due.
- **Track token usage** — every action Ava takes gets logged in an audit trail with token consumption and remaining budget, so I can see burn rate and what's using the most tokens.
- **Report back reliably** — the core problem was that Ava would say it was going to do something and then I'd never hear back. With projects and tasks, there's always a clear status: working, completed, failed, or scheduled for later.

I'm the one who views the dashboard. Claude Code interacts with it purely through the API.

## Why Not Use Existing Tools?

There are probably Claude Code skills and MCP servers that do parts of this already. I wanted mine to:

- **Run on Firebase** so I can view the dashboard from my phone, laptop, or any device — not just the machine Ava runs on.
- **Have a proper API with Swagger docs** so Claude Code can interact with it cleanly via HTTP.
- **Support future interaction** — I want to be able to cancel projects, reprioritize tasks, or add work from the dashboard, not just passively observe.
- **Persist across restarts** — Firebase emulators with automatic backup mean nothing is lost when processes restart.

## Tech Stack

- **Frontend:** SvelteKit 2 + Svelte 5, Tailwind CSS v4, dark theme
- **Backend:** Firebase Cloud Functions v2 (Express API)
- **Database:** Firestore
- **Auth:** Firebase Auth (Email + Google) for the dashboard, API keys for Claude Code
- **Docs:** Swagger/OpenAPI at `/docs`
- **Dev:** Firebase emulators, PM2 for process management, pnpm

## Getting Started

```bash
# Install dependencies
pnpm install
cd functions && pnpm install && cd ..

# Make scripts executable
chmod +x scripts/*.sh

# Start everything via PM2
pm2 start ecosystem.config.cjs

# Or start individually
pnpm run dev                    # Frontend on :7500
./scripts/start-emulators.sh    # Emulators on :7510-7516
```

The dashboard runs at `http://localhost:7500` and the API at `http://localhost:7510/ava-dash/us-central1/api`.

Swagger docs are at `http://localhost:7510/ava-dash/us-central1/api/docs`.

## How Claude Code Uses It

Claude Code authenticates with an API key (generated from the admin panel) and interacts via REST:

```bash
# Create a project with tasks
curl -X POST $API_BASE/projects \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research competitor pricing",
    "status": "active",
    "tasks": [
      {"title": "Identify target websites"},
      {"title": "Scrape pricing data"},
      {"title": "Compile report"}
    ]
  }'

# Schedule a task for later
curl -X POST $API_BASE/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tasks": [{"title": "Send Friday reminder", "scheduledFor": "2026-04-17T09:00:00Z"}]}'

# Log token usage
curl -X POST $API_BASE/activity \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "research_performed", "source": "email", "tokensUsed": 2500, "tokensRemaining": 47500}'
```

See `docs/AVA_MDP.md` for the full behavioral protocol that guides how Ava should use the platform.

## Documentation

- `docs/AVA_MDP.md` — How Ava should use the platform (mission & decision protocol)
- `docs/api.md` — API reference with curl examples
- `docs/models.md` — Firestore data model schemas
- `docs/interfaces.md` — TypeScript interfaces
- `docs/UXGuidelines.md` — Design tokens and component guidelines
- `AGENTS.md` — Quick-reference context for AI sessions
