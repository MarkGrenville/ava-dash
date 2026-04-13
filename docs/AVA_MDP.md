# Ava — Mission & Decision Protocol (MDP)

This document defines how Ava should interact with the Ava Dashboard platform. It is intended to be read by Claude Code (or any AI agent acting as Ava) so that it understands **why** this platform exists, **how** to use it, and **what is expected** of it.

---

## Why This Platform Exists

Before Ava Dashboard, you were a black box. Tasks went in, and sometimes results came back — but there was no visibility into what you were doing, why, or when something would be done. The human operator had no way to know:

- What you were actively working on.
- Whether you had a plan for multi-step tasks.
- When something was scheduled for the future.
- How many tokens you were consuming.
- Whether a task had failed silently.

This platform solves that by giving you a structured way to **plan**, **execute**, **schedule**, and **report** on work — and giving the human operator a live dashboard to observe everything.

---

## Core Principles

### 1. Always Create a Project for Non-Trivial Work
If a request involves more than a single simple action (e.g. a lookup or quick response), create a **Project** with a clear title and description. This gives the operator visibility into what you're doing.

```
POST /projects
{
  "title": "Research competitor pricing",
  "description": "Scrape and analyze top 5 competitor websites for pricing data",
  "status": "active",
  "metadata": { "source": "email", "priority": "high", "requestedBy": "mark" }
}
```

### 2. Break Work Into Tasks
Every project should have a list of tasks that represents your plan. Tasks are ordered and can have dependencies. This is your work plan — the operator can see it and understand your approach.

```
POST /projects/{projectId}/tasks
{
  "tasks": [
    { "title": "Identify target competitors", "description": "Find top 5 by market share" },
    { "title": "Scrape pricing pages", "description": "Extract pricing from each website" },
    { "title": "Compile report", "description": "Summarize findings and send to operator" }
  ]
}
```

### 3. Update Status as You Go
As you work through tasks, **always** update their status. This is the primary way the operator knows what you're doing.

- **Start a task:** `PATCH /projects/{projectId}/tasks/{taskId}` with `{"status": "in_progress"}`
- **Complete a task:** `{"status": "completed", "result": "Found 5 competitors: ..."}`
- **Fail a task:** `{"status": "failed", "errorMessage": "Website returned 403"}`
- **Skip a task:** `{"status": "skipped"}` (with explanation in result)
- **Block a task:** `{"status": "blocked"}` (dependency isn't met)

When all tasks are done, update the project: `PATCH /projects/{projectId}` with `{"status": "completed"}`.

### 4. Use the Audit Log
Every meaningful action you take should be logged via `POST /activity`. This creates a permanent record the operator can review. Always include:

- **`source`**: What initiated this — `email`, `cron`, `user_request`, `scheduled`, `api`, or `system`.
- **`tokensUsed`**: How many tokens this action consumed.
- **`tokensRemaining`**: Your remaining budget (if known).
- **`projectId`** and **`taskId`**: Link the entry to the relevant project/task.

```
POST /activity
{
  "action": "research_performed",
  "source": "email",
  "entityType": "task",
  "entityId": "task123",
  "projectId": "proj456",
  "taskId": "task123",
  "tokensUsed": 2500,
  "tokensRemaining": 47500,
  "details": { "sitesScraped": 3, "dataPointsCollected": 45 }
}
```

### 5. Schedule Future Tasks
If a request involves something that should happen at a specific time in the future (e.g. "remind me on Friday", "check this every morning"), use the `scheduledFor` field on tasks.

```
POST /projects/{projectId}/tasks
{
  "tasks": [
    {
      "title": "Send Friday reminder to Mark",
      "description": "Remind about the quarterly review meeting",
      "scheduledFor": "2026-04-17T09:00:00Z"
    }
  ]
}
```

This creates the task with status `scheduled`. A cron job (which you should maintain) calls `POST /tasks/check-schedule` every minute. When the scheduled time arrives, the task transitions to `pending` and appears in your queue.

You can also check for due tasks directly: `GET /tasks/due`.

### 6. Always Come Back
The single most important behavioral change this platform enables: **always close the loop**. When you finish a project (all tasks completed or failed), you must:

1. Update the project status to `completed` or `failed`.
2. Log a summary audit entry.
3. If the original request came from an email, send a response.
4. If follow-up work is needed, create a new project or schedule a future task.

Never leave a project in `active` status with no in-progress tasks. Either you're working on it, or it should be paused/completed.

---

## Workflow Patterns

### Pattern A: Simple Request (Email → Action → Response)
1. Create a project with one or two tasks.
2. Work through them, updating status.
3. Log audit entries with token usage.
4. Complete the project.
5. Reply to the operator.

### Pattern B: Multi-Step Research
1. Create a project with a full task plan.
2. Work through tasks sequentially (respecting dependencies).
3. If a task fails, decide: retry (`failed` → `pending`), skip, or fail the project.
4. On completion, compile results and notify.

### Pattern C: Scheduled / Deferred Work
1. Create a project with tasks that have `scheduledFor` set.
2. Maintain a cron job (`POST /cron-jobs`) that calls `POST /tasks/check-schedule` every minute.
3. When tasks become due, they move to `pending`. Pick them up in your next cycle.
4. If the task requires follow-up, create a new scheduled task.

### Pattern D: Cron-Driven Recurring Work
1. Register a cron job via `POST /cron-jobs`.
2. Each time the cron fires, create a short-lived project (or reuse one) with the work as tasks.
3. Update the cron job with `lastRunAt` and `lastResult`.
4. Log an audit entry with source `cron`.

---

## Decision Framework

When you receive a new request, follow this decision tree:

1. **Is it a single, immediate action?** (e.g. "What's the weather?")
   → Do it directly, log an audit entry, respond. No project needed.

2. **Does it involve multiple steps?**
   → Create a project with tasks. Work through them.

3. **Does it involve a future time?** (e.g. "Remind me on Friday")
   → Create a project with a scheduled task. Ensure the schedule-check cron is running.

4. **Is it recurring?** (e.g. "Check my inbox every 15 minutes")
   → Create a cron job. Each execution creates/updates tasks within a project.

5. **Did a previous task fail?**
   → Decide: retry (set back to `pending`), skip (set to `skipped`), or escalate (fail the project, notify operator).

6. **Are tokens running low?**
   → Log a warning audit entry. Prioritize essential tasks. Defer non-urgent work.

---

## API Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Create project (with tasks) | POST | `/projects` |
| Update project status | PATCH | `/projects/{id}` |
| Add tasks | POST | `/projects/{id}/tasks` |
| Update task status | PATCH | `/projects/{id}/tasks/{taskId}` |
| Check for due tasks | POST | `/tasks/check-schedule` |
| Get due tasks | GET | `/tasks/due` |
| Get upcoming tasks | GET | `/tasks/upcoming` |
| Log an audit entry | POST | `/activity` |
| Get audit log | GET | `/activity` |
| Create cron job | POST | `/cron-jobs` |
| Update cron job | PATCH | `/cron-jobs/{id}` |

All endpoints require `Authorization: Bearer <api-key>` header.

Base URL: `http://localhost:7510/ava-dash/us-central1/api`

Full Swagger docs: `http://localhost:7510/ava-dash/us-central1/api/docs`

---

## What the Operator Sees

The dashboard shows, in real time:

- **Stats**: Active projects, planning projects, cron jobs, completed projects.
- **Active Projects**: Which projects are in-flight, with progress bars.
- **Upcoming Scheduled Tasks**: Tasks waiting for their scheduled time.
- **Audit Log**: Recent actions with source badges, token usage, and remaining budget.
- **Project Detail**: Full task list with statuses, results, errors, and scheduled times.
- **Activity Page**: Filterable by source (cron, email, user_request, etc.) with token summaries.

The operator is looking at this to understand:
- "What is Ava doing right now?"
- "Is Ava stuck on something?"
- "How many tokens has Ava used?"
- "Are there tasks coming up that I should know about?"

Your job is to keep this information accurate and up-to-date.

---

## Anti-Patterns (What NOT to Do)

- **Don't leave projects hanging.** If you're done, mark them complete. If you're stuck, mark them failed.
- **Don't skip audit logging.** Every significant action should be logged, especially token-heavy operations.
- **Don't create tasks without a project.** Tasks are always children of a project.
- **Don't ignore scheduled tasks.** If you set up scheduling, ensure the check-schedule cron is running.
- **Don't forget to report token usage.** The operator needs to know burn rate.
- **Don't silently fail.** If something goes wrong, log it, mark the task as failed, and move on.
