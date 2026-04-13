export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'failed';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'blocked' | 'scheduled';

export type CronJobStatus = 'active' | 'paused' | 'disabled';

export type ApiKeyStatus = 'active' | 'revoked';

export type EntityType = 'project' | 'task' | 'cronJob' | 'system';

export type AuditSource = 'cron' | 'user_request' | 'email' | 'api' | 'system' | 'scheduled';

export interface User {
	uid: string;
	email: string;
	displayName: string;
	role: 'admin' | 'user';
	createdAt: string;
}

export interface Project {
	id: string;
	userId: string;
	title: string;
	description: string;
	status: ProjectStatus;
	totalTasks: number;
	completedTasks: number;
	metadata: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	completedAt: string | null;
	tasks?: Task[];
}

export interface Task {
	id: string;
	projectId: string;
	title: string;
	description: string;
	status: TaskStatus;
	order: number;
	dependencies: string[];
	result: string | null;
	errorMessage: string | null;
	scheduledFor: string | null;
	startedAt: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CronJob {
	id: string;
	userId: string;
	name: string;
	description: string;
	schedule: string;
	status: CronJobStatus;
	lastRunAt: string | null;
	lastResult: string | null;
	nextRunAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ActivityLogEntry {
	id: string;
	userId: string;
	entityType: EntityType;
	entityId: string;
	action: string;
	source: AuditSource;
	projectId: string | null;
	taskId: string | null;
	tokensUsed: number | null;
	tokensRemaining: number | null;
	details: Record<string, unknown>;
	createdAt: string;
}

export interface ApiKey {
	id: string;
	userId: string;
	name: string;
	keyPrefix: string;
	lastUsedAt: string | null;
	createdAt: string;
	expiresAt: string | null;
	status: ApiKeyStatus;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
}
