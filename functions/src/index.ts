import { initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import express, { Router } from 'express';
import cors from 'cors';

import { swaggerSpec } from './swagger.js';
import { authMiddleware } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { cronJobsRouter } from './routes/cronJobs.js';
import { activityRouter } from './routes/activity.js';
import { apiKeysRouter } from './routes/apiKeys.js';
import { scheduledTasksRouter } from './routes/scheduledTasks.js';

initializeApp();

setGlobalOptions({
	region: 'us-central1',
	maxInstances: 10,
});

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const apiRouter = Router();

apiRouter.get('/docs.json', (_req, res) => {
	res.json(swaggerSpec);
});

const swaggerPage = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ava Dashboard API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
<style>body{margin:0} .swagger-ui .topbar{display:none}</style>
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:location.href.replace(/\\/docs\\/?$/,'/docs.json'),dom_id:'#swagger-ui',deepLinking:true})</script>
</body></html>`;

apiRouter.get('/docs', (_req, res) => {
	res.type('html').send(swaggerPage);
});
apiRouter.get('/docs/', (_req, res) => {
	res.type('html').send(swaggerPage);
});

apiRouter.use('/health', healthRouter);

apiRouter.use('/projects', authMiddleware, projectsRouter);
apiRouter.use('/projects', authMiddleware, tasksRouter);
apiRouter.use('/cron-jobs', authMiddleware, cronJobsRouter);
apiRouter.use('/activity', authMiddleware, activityRouter);
apiRouter.use('/tasks', authMiddleware, scheduledTasksRouter);
apiRouter.use('/api-keys', authMiddleware, apiKeysRouter);

// Mount at root (direct function URL) and at /api (hosting rewrite)
app.use('/', apiRouter);
app.use('/api', apiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error('[api] Unhandled error:', err);
	res.status(500).json({
		success: false,
		error: {
			code: 'INTERNAL_ERROR',
			message: err.message || 'An unexpected error occurred',
		},
	});
});

export const api = onRequest(
	{
		timeoutSeconds: 120,
		memory: '512MiB',
	},
	app
);

export { app };
