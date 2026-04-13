# Ava Dashboard — TypeScript Interfaces

All shared interfaces are defined in `src/lib/types/index.ts`. Cloud Functions use equivalent shapes from `firebase-admin` types.

## Status Enums

```typescript
type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'failed';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked' | 'scheduled';
type CronJobStatus = 'active' | 'paused' | 'disabled';
type ApiKeyStatus = 'active' | 'revoked';
type EntityType = 'project' | 'task' | 'cronJob' | 'system';
type AuditSource = 'cron' | 'user_request' | 'email' | 'api' | 'system' | 'scheduled';
```

## Entity Interfaces

```typescript
interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: ProjectStatus;
  totalTasks: number;
  completedTasks: number;
  metadata: Record<string, unknown>;
  createdAt: string;      // ISO 8601
  updatedAt: string;
  completedAt: string | null;
  tasks?: Task[];          // populated on GET /projects/:id
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  order: number;
  dependencies: string[];  // task IDs
  result: string | null;
  errorMessage: string | null;
  scheduledFor: string | null;  // ISO 8601 — when this task should execute
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CronJob {
  id: string;
  userId: string;
  name: string;
  description: string;
  schedule: string;        // cron expression
  status: CronJobStatus;
  lastRunAt: string | null;
  lastResult: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivityLogEntry {
  id: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  action: string;
  source: AuditSource;              // what initiated this action
  projectId: string | null;         // associated project
  taskId: string | null;            // associated task
  tokensUsed: number | null;        // tokens consumed
  tokensRemaining: number | null;   // budget remaining
  details: Record<string, unknown>;
  createdAt: string;
}

interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  status: ApiKeyStatus;
}
```

## API Response Wrapper

All API responses use this wrapper:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

## Request Bodies

### POST /projects
```typescript
{
  title: string;                    // required
  description?: string;
  status?: 'planning' | 'active';  // default: 'planning'
  metadata?: Record<string, unknown>;
  tasks?: Array<{
    title: string;                  // required
    description?: string;
    order?: number;                 // auto-assigned if omitted
    scheduledFor?: string;          // ISO 8601 — sets status to 'scheduled'
    dependencies?: string[];
  }>;
}
```

### PATCH /projects/:id/tasks/:taskId
```typescript
{
  status?: TaskStatus;
  result?: string;
  errorMessage?: string;
  title?: string;
  description?: string;
  scheduledFor?: string;  // ISO 8601 — auto-sets status to 'scheduled' if provided
}
```

### POST /activity
```typescript
{
  action: string;                   // required — what happened
  source: AuditSource;             // required — what initiated it
  entityType?: EntityType;         // default: 'system'
  entityId?: string;
  projectId?: string;
  taskId?: string;
  tokensUsed?: number;
  tokensRemaining?: number;
  details?: Record<string, unknown>;
}
```
