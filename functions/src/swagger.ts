import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: '3.0.3',
		info: {
			title: 'Ava Dashboard API',
			version: '0.1.0',
			description:
				'API for the Ava bot task management system. Claude Code interacts with this API using Bearer token authentication to manage projects, tasks, and cron jobs.',
			contact: {
				name: 'Ava Dashboard',
			},
		},
		servers: [
			{
				url: 'http://localhost:7510/ava-dash/us-central1/api',
				description: 'Local emulator',
			},
			{
				url: 'https://us-central1-ava-dash.cloudfunctions.net/api',
				description: 'Production',
			},
		],
		components: {
			securitySchemes: {
				BearerAuth: {
					type: 'http',
					scheme: 'bearer',
					description: 'API key generated from the admin dashboard',
				},
			},
			schemas: {
				Project: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						userId: { type: 'string' },
						title: { type: 'string' },
						description: { type: 'string' },
						status: {
							type: 'string',
							enum: ['planning', 'active', 'paused', 'completed', 'failed'],
						},
						totalTasks: { type: 'integer' },
						completedTasks: { type: 'integer' },
						metadata: { type: 'object', additionalProperties: true },
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
						completedAt: { type: 'string', format: 'date-time', nullable: true },
					},
				},
				Task: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						projectId: { type: 'string' },
						title: { type: 'string' },
						description: { type: 'string' },
						status: {
							type: 'string',
							enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped', 'blocked', 'scheduled'],
						},
						order: { type: 'integer' },
						dependencies: { type: 'array', items: { type: 'string' } },
						result: { type: 'string', nullable: true },
						errorMessage: { type: 'string', nullable: true },
						scheduledFor: { type: 'string', format: 'date-time', nullable: true, description: 'ISO datetime when this task should be executed' },
						startedAt: { type: 'string', format: 'date-time', nullable: true },
						completedAt: { type: 'string', format: 'date-time', nullable: true },
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				CronJob: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						userId: { type: 'string' },
						name: { type: 'string' },
						description: { type: 'string' },
						schedule: { type: 'string' },
						status: { type: 'string', enum: ['active', 'paused', 'disabled'] },
						lastRunAt: { type: 'string', format: 'date-time', nullable: true },
						lastResult: { type: 'string', nullable: true },
						nextRunAt: { type: 'string', format: 'date-time', nullable: true },
						createdAt: { type: 'string', format: 'date-time' },
						updatedAt: { type: 'string', format: 'date-time' },
					},
				},
				ActivityLogEntry: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						userId: { type: 'string' },
						entityType: { type: 'string', enum: ['project', 'task', 'cronJob', 'system'] },
						entityId: { type: 'string' },
						action: { type: 'string' },
						source: { type: 'string', enum: ['cron', 'user_request', 'email', 'api', 'system', 'scheduled'], description: 'What initiated this action' },
						projectId: { type: 'string', nullable: true, description: 'Associated project ID' },
						taskId: { type: 'string', nullable: true, description: 'Associated task ID' },
						tokensUsed: { type: 'integer', nullable: true, description: 'Tokens consumed by this action' },
						tokensRemaining: { type: 'integer', nullable: true, description: 'Remaining token budget after this action' },
						details: { type: 'object', additionalProperties: true },
						createdAt: { type: 'string', format: 'date-time' },
					},
				},
				ApiKey: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						userId: { type: 'string' },
						name: { type: 'string' },
						keyPrefix: { type: 'string' },
						lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
						createdAt: { type: 'string', format: 'date-time' },
						expiresAt: { type: 'string', format: 'date-time', nullable: true },
						status: { type: 'string', enum: ['active', 'revoked'] },
					},
				},
				Error: {
					type: 'object',
					properties: {
						success: { type: 'boolean', example: false },
						error: {
							type: 'object',
							properties: {
								code: { type: 'string' },
								message: { type: 'string' },
							},
						},
					},
				},
			},
		},
		security: [{ BearerAuth: [] }],
	},
	apis: ['./src/routes/*.ts', './lib/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
