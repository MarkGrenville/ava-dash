# Ava Dashboard — API Reference

Base URL (emulator): `http://localhost:7510/ava-dash/us-central1/api`

Swagger UI: `http://localhost:7510/ava-dash/us-central1/api/docs`

## Authentication

All endpoints except `/health` and `/docs` require authentication.

**For Claude Code (API key):**
```
Authorization: Bearer avk_<hex>
```

**For dashboard (Firebase token):**
```
Authorization: Bearer <firebase-id-token>
```

---

## Endpoints

### GET `/health`
Health check — no auth required.

```bash
curl http://localhost:7510/ava-dash/us-central1/api/health
```

### POST `/projects`
Create a project with optional inline tasks (single call to plan a full workflow).

```bash
curl -X POST http://localhost:7510/ava-dash/us-central1/api/projects \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Research competitor pricing",
    "description": "Scrape and analyze competitor websites",
    "status": "active",
    "metadata": {"source": "email", "priority": "high"},
    "tasks": [
      {"title": "Identify target websites", "description": "Find top 5 competitors"},
      {"title": "Scrape pricing data", "description": "Extract prices from each site"},
      {"title": "Compile report", "description": "Summarize findings and send email"}
    ]
  }'
```

### GET `/projects`
List projects. Optional query params: `status`, `limit`.

```bash
curl http://localhost:7510/ava-dash/us-central1/api/projects \
  -H "Authorization: Bearer $AVA_API_KEY"

# Filter by status
curl "http://localhost:7510/ava-dash/us-central1/api/projects?status=active" \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### GET `/projects/:id`
Get a project with all its tasks.

```bash
curl http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### PATCH `/projects/:id`
Update project status, title, description, or metadata.

```bash
curl -X PATCH http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### DELETE `/projects/:id`
Delete a project and all its tasks.

```bash
curl -X DELETE http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### POST `/projects/:id/tasks`
Add more tasks to an existing project. Use `scheduledFor` for time-specific tasks.

```bash
curl -X POST http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID/tasks \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"title": "Additional research step"},
      {"title": "Send reminder on Friday", "scheduledFor": "2026-04-17T09:00:00Z"}
    ]
  }'
```

### GET `/projects/:id/tasks`
List tasks for a project. Optional query param: `status`.

```bash
curl http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID/tasks \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### PATCH `/projects/:id/tasks/:taskId`
Update a task — status, result, error, title, description.

```bash
# Start working on a task
curl -X PATCH http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID/tasks/TASK_ID \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# Complete a task with result
curl -X PATCH http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID/tasks/TASK_ID \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "result": "Found 5 competitors with prices ranging from $10-$50"}'

# Fail a task
curl -X PATCH http://localhost:7510/ava-dash/us-central1/api/projects/PROJECT_ID/tasks/TASK_ID \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "failed", "errorMessage": "Website blocked scraping"}'
```

### DELETE `/projects/:id/tasks/:taskId`
Delete a task.

### GET `/cron-jobs`
List cron jobs. Optional query param: `status`.

```bash
curl http://localhost:7510/ava-dash/us-central1/api/cron-jobs \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### POST `/cron-jobs`
Register a cron job.

```bash
curl -X POST http://localhost:7510/ava-dash/us-central1/api/cron-jobs \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Check inbox", "schedule": "*/15 * * * *", "description": "Check for new emails"}'
```

### PATCH `/cron-jobs/:id`
Update a cron job — name, schedule, status, lastRunAt, lastResult, nextRunAt.

### DELETE `/cron-jobs/:id`
Delete a cron job.

### POST `/activity`
Log an audit entry. Ava should call this for every significant action with token usage.

```bash
curl -X POST http://localhost:7510/ava-dash/us-central1/api/activity \
  -H "Authorization: Bearer $AVA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "research_performed",
    "source": "email",
    "entityType": "task",
    "entityId": "TASK_ID",
    "projectId": "PROJECT_ID",
    "taskId": "TASK_ID",
    "tokensUsed": 2500,
    "tokensRemaining": 47500,
    "details": {"sitesScraped": 3}
  }'
```

### GET `/activity`
Get audit log. Optional query params: `entityType`, `entityId`, `source`, `projectId`, `limit`.

```bash
curl http://localhost:7510/ava-dash/us-central1/api/activity \
  -H "Authorization: Bearer $AVA_API_KEY"

# Filter by source
curl "http://localhost:7510/ava-dash/us-central1/api/activity?source=cron" \
  -H "Authorization: Bearer $AVA_API_KEY"

# Filter by project
curl "http://localhost:7510/ava-dash/us-central1/api/activity?projectId=PROJECT_ID" \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### GET `/tasks/due`
Get tasks that are due for execution (status `scheduled` and `scheduledFor <= now`).

```bash
curl http://localhost:7510/ava-dash/us-central1/api/tasks/due \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### GET `/tasks/upcoming`
Get upcoming scheduled tasks (status `scheduled` and `scheduledFor > now`).

```bash
curl http://localhost:7510/ava-dash/us-central1/api/tasks/upcoming \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### POST `/tasks/check-schedule`
Check and activate due scheduled tasks. Transitions matching tasks from `scheduled` to `pending` and logs audit entries. Ava's per-minute cron should call this.

```bash
curl -X POST http://localhost:7510/ava-dash/us-central1/api/tasks/check-schedule \
  -H "Authorization: Bearer $AVA_API_KEY"
```

### GET `/api-keys`
List API keys (metadata only, no secrets).

### POST `/api-keys`
Generate a new API key. Returns the raw key once.

```bash
curl -X POST http://localhost:7510/ava-dash/us-central1/api/api-keys \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Claude Code", "expiresInDays": null}'
```

### POST `/api-keys/:id/revoke`
Revoke an API key.
