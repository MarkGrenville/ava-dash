# Ava Dashboard — Data Models

## Firestore Collections

### `users/{uid}`
| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID |
| `email` | string | Email address |
| `displayName` | string | Full name |
| `role` | string | Always `"admin"` for now |
| `createdAt` | string (ISO) | Account creation timestamp |

### `projects/{projectId}`
| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Owner's UID |
| `title` | string | Project title |
| `description` | string | Project description |
| `status` | string | `planning`, `active`, `paused`, `completed`, `failed` |
| `totalTasks` | number | Total number of tasks in this project |
| `completedTasks` | number | Number of completed tasks |
| `metadata` | object | Freeform JSON for Claude to store context |
| `createdAt` | Timestamp | When the project was created |
| `updatedAt` | Timestamp | Last modification time |
| `completedAt` | Timestamp? | When all tasks completed (null if not done) |

**Status transitions:**
- `planning` → `active` (Claude starts working)
- `active` → `paused` (temporarily halted)
- `active` → `completed` (all tasks done)
- `active` → `failed` (unrecoverable error)
- `paused` → `active` (resume)

### `projects/{projectId}/tasks/{taskId}`
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Task title |
| `description` | string | What this task involves |
| `status` | string | `pending`, `in_progress`, `completed`, `failed`, `skipped`, `blocked`, `scheduled` |
| `order` | number | Execution order (0-based) |
| `dependencies` | string[] | Task IDs that must complete first |
| `result` | string? | Output/result text from completion |
| `errorMessage` | string? | Error details if failed |
| `scheduledFor` | Timestamp? | When this task should be executed (null = immediate) |
| `startedAt` | Timestamp? | When work began |
| `completedAt` | Timestamp? | When task finished |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update time |

**Status transitions:**
- `pending` → `in_progress` (Claude picks up the task)
- `scheduled` → `pending` (scheduled time arrived, activated by check-schedule)
- `in_progress` → `completed` (done, `result` populated)
- `in_progress` → `failed` (error, `errorMessage` populated)
- `pending` → `blocked` (dependency not met)
- `pending`/`blocked` → `skipped` (not needed anymore)
- `failed` → `pending` (retry)

**Scheduling:** When `scheduledFor` is provided during task creation, the status is automatically set to `scheduled`. A cron job calling `POST /tasks/check-schedule` every minute activates due tasks by transitioning them to `pending`.

### `cronJobs/{cronJobId}`
| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Owner's UID |
| `name` | string | Job name |
| `description` | string | What this job does |
| `schedule` | string | Cron expression (e.g. `0 */6 * * *`) |
| `status` | string | `active`, `paused`, `disabled` |
| `lastRunAt` | Timestamp? | When last executed |
| `lastResult` | string? | Output from last run |
| `nextRunAt` | Timestamp? | Scheduled next execution |
| `createdAt` | Timestamp | Creation time |
| `updatedAt` | Timestamp | Last update time |

### `activityLog/{logId}` (Audit Log)
| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User who owns this entry |
| `entityType` | string | `project`, `task`, `cronJob`, `system` |
| `entityId` | string | ID of the related entity |
| `action` | string | Action name (e.g. `project_created`, `task_completed`, `research_performed`) |
| `source` | string | What initiated this: `cron`, `user_request`, `email`, `api`, `system`, `scheduled` |
| `projectId` | string? | Associated project ID (for cross-referencing) |
| `taskId` | string? | Associated task ID (for cross-referencing) |
| `tokensUsed` | number? | Tokens consumed by this action |
| `tokensRemaining` | number? | Remaining token budget after this action |
| `details` | object | Additional context (varies by action) |
| `createdAt` | Timestamp | When the event occurred |

Activity log entries are immutable — they cannot be updated or deleted. Ava should log all significant actions with token usage via `POST /activity`.

### `apiKeys/{keyId}`
| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Key owner's UID |
| `name` | string | Display name for the key |
| `keyHash` | string | SHA-256 hash of the raw key |
| `keyPrefix` | string | First 12 chars of raw key (for display) |
| `lastUsedAt` | Timestamp? | When the key was last used |
| `createdAt` | Timestamp | When the key was generated |
| `expiresAt` | Timestamp? | Expiration date (null = never expires) |
| `status` | string | `active`, `revoked` |

API keys are prefixed with `avk_` followed by 64 hex characters.
