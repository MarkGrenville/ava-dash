import { Router, Response } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();
const db = () => getFirestore();

function toISO(ts: Timestamp | null | undefined): string | null {
	return ts ? ts.toDate().toISOString() : null;
}

/**
 * @swagger
 * /tasks/due:
 *   get:
 *     summary: Get tasks that are due for execution
 *     description: >
 *       Returns all tasks with status 'scheduled' whose scheduledFor time is at or before
 *       the current time (or a specified cutoff). Ava's cron job should call this every
 *       minute to discover tasks that need to run.
 *     tags: [Scheduled Tasks]
 *     parameters:
 *       - in: query
 *         name: cutoff
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "ISO datetime cutoff (defaults to now). Tasks scheduled at or before this time are returned."
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of due tasks with their project context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Task'
 *                       - type: object
 *                         properties:
 *                           projectTitle:
 *                             type: string
 */
router.get('/due', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const cutoffStr = req.query.cutoff as string | undefined;
		const cutoff = cutoffStr ? new Date(cutoffStr) : new Date();
		const maxLimit = Math.min(parseInt(req.query.limit as string || '20', 10) || 20, 100);

		const projectsSnap = await db()
			.collection('projects')
			.where('userId', '==', req.userId)
			.get();

		const dueTasks: Record<string, unknown>[] = [];

		for (const projectDoc of projectsSnap.docs) {
			const tasksSnap = await projectDoc.ref
				.collection('tasks')
				.where('status', '==', 'scheduled')
				.where('scheduledFor', '<=', cutoff)
				.orderBy('scheduledFor', 'asc')
				.limit(maxLimit)
				.get();

			for (const taskDoc of tasksSnap.docs) {
				const data = taskDoc.data();
				dueTasks.push({
					id: taskDoc.id,
					projectId: projectDoc.id,
					projectTitle: projectDoc.data().title,
					title: data.title,
					description: data.description,
					status: data.status,
					order: data.order,
					dependencies: data.dependencies || [],
					scheduledFor: toISO(data.scheduledFor),
					result: data.result || null,
					errorMessage: data.errorMessage || null,
					startedAt: toISO(data.startedAt),
					completedAt: toISO(data.completedAt),
					createdAt: toISO(data.createdAt),
					updatedAt: toISO(data.updatedAt),
				});

				if (dueTasks.length >= maxLimit) break;
			}
			if (dueTasks.length >= maxLimit) break;
		}

		console.log(`[scheduledTasks] Found ${dueTasks.length} due tasks for user=${req.userId}`);
		res.json({ success: true, data: dueTasks });
	} catch (err) {
		console.error('[scheduledTasks] Due tasks error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /tasks/check-schedule:
 *   post:
 *     summary: Check and activate due scheduled tasks
 *     description: >
 *       Finds all tasks with status 'scheduled' that are due, transitions them to 'pending',
 *       and returns the list. Ava's per-minute cron job should call this endpoint to
 *       activate tasks at their scheduled time. Optionally creates follow-up tasks.
 *     tags: [Scheduled Tasks]
 *     responses:
 *       200:
 *         description: Activated tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activated:
 *                       type: integer
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           taskId:
 *                             type: string
 *                           projectId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           projectTitle:
 *                             type: string
 */
router.post('/check-schedule', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const now = new Date();
		const projectsSnap = await db()
			.collection('projects')
			.where('userId', '==', req.userId)
			.get();

		const activated: { taskId: string; projectId: string; title: string; projectTitle: string }[] = [];

		for (const projectDoc of projectsSnap.docs) {
			const tasksSnap = await projectDoc.ref
				.collection('tasks')
				.where('status', '==', 'scheduled')
				.where('scheduledFor', '<=', now)
				.get();

			for (const taskDoc of tasksSnap.docs) {
				const batch = db().batch();
				batch.update(taskDoc.ref, {
					status: 'pending',
					updatedAt: FieldValue.serverTimestamp(),
				});
				await batch.commit();

				const taskData = taskDoc.data();
				activated.push({
					taskId: taskDoc.id,
					projectId: projectDoc.id,
					title: taskData.title,
					projectTitle: projectDoc.data().title,
				});

				await db().collection('activityLog').add({
					userId: req.userId,
					entityType: 'task',
					entityId: taskDoc.id,
					action: 'task_schedule_activated',
					source: 'scheduled',
					projectId: projectDoc.id,
					taskId: taskDoc.id,
					tokensUsed: null,
					tokensRemaining: null,
					details: {
						taskTitle: taskData.title,
						projectTitle: projectDoc.data().title,
						scheduledFor: toISO(taskData.scheduledFor),
					},
					createdAt: FieldValue.serverTimestamp(),
				});
			}
		}

		console.log(`[scheduledTasks] Activated ${activated.length} scheduled tasks for user=${req.userId}`);
		res.json({ success: true, data: { activated: activated.length, tasks: activated } });
	} catch (err) {
		console.error('[scheduledTasks] Check-schedule error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /tasks/upcoming:
 *   get:
 *     summary: Get upcoming scheduled tasks
 *     description: Returns tasks with status 'scheduled' whose scheduledFor is in the future, ordered by time.
 *     tags: [Scheduled Tasks]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of upcoming scheduled tasks
 */
router.get('/upcoming', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const now = new Date();
		const maxLimit = Math.min(parseInt(req.query.limit as string || '20', 10) || 20, 100);

		const projectsSnap = await db()
			.collection('projects')
			.where('userId', '==', req.userId)
			.get();

		const upcoming: Record<string, unknown>[] = [];

		for (const projectDoc of projectsSnap.docs) {
			const tasksSnap = await projectDoc.ref
				.collection('tasks')
				.where('status', '==', 'scheduled')
				.where('scheduledFor', '>', now)
				.orderBy('scheduledFor', 'asc')
				.limit(maxLimit)
				.get();

			for (const taskDoc of tasksSnap.docs) {
				const data = taskDoc.data();
				upcoming.push({
					id: taskDoc.id,
					projectId: projectDoc.id,
					projectTitle: projectDoc.data().title,
					title: data.title,
					description: data.description,
					status: data.status,
					scheduledFor: toISO(data.scheduledFor),
					createdAt: toISO(data.createdAt),
				});
				if (upcoming.length >= maxLimit) break;
			}
			if (upcoming.length >= maxLimit) break;
		}

		upcoming.sort((a, b) => new Date(a.scheduledFor as string).getTime() - new Date(b.scheduledFor as string).getTime());

		console.log(`[scheduledTasks] Found ${upcoming.length} upcoming tasks for user=${req.userId}`);
		res.json({ success: true, data: upcoming });
	} catch (err) {
		console.error('[scheduledTasks] Upcoming error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

export { router as scheduledTasksRouter };
