import { Router, Response } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { AuthenticatedRequest, param } from '../middleware/auth.js';

const router = Router();
const db = () => getFirestore();

function toISO(ts: Timestamp | null | undefined): string | null {
	return ts ? ts.toDate().toISOString() : null;
}

/**
 * @swagger
 * /projects/{projectId}/tasks:
 *   get:
 *     summary: List tasks for a project
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_progress, completed, failed, skipped, blocked, scheduled]
 *     responses:
 *       200:
 *         description: List of tasks
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
 *                     $ref: '#/components/schemas/Task'
 */
router.get('/:projectId/tasks', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'projectId');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists || projectDoc.data()!.userId !== req.userId) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		const statusFilter = req.query.status as string | undefined;
		let query = projectRef.collection('tasks').orderBy('order', 'asc') as FirebaseFirestore.Query;

		if (statusFilter) {
			query = projectRef
				.collection('tasks')
				.where('status', '==', statusFilter)
				.orderBy('order', 'asc');
		}

		const snapshot = await query.get();
		const tasks = snapshot.docs.map((doc) => ({
			id: doc.id,
			projectId,
			...doc.data(),
			scheduledFor: toISO(doc.data().scheduledFor),
			startedAt: toISO(doc.data().startedAt),
			completedAt: toISO(doc.data().completedAt),
			createdAt: toISO(doc.data().createdAt),
			updatedAt: toISO(doc.data().updatedAt),
		}));

		console.log(`[tasks] Listed ${tasks.length} tasks for project=${projectId}`);
		res.json({ success: true, data: tasks });
	} catch (err) {
		console.error('[tasks] List error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects/{projectId}/tasks:
 *   post:
 *     summary: Add tasks to a project
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tasks:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title]
 *                   properties:
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     order:
 *                       type: integer
 *                     scheduledFor:
 *                       type: string
 *                       format: date-time
 *                       description: "ISO datetime to execute this task (sets status to 'scheduled')"
 *                     dependencies:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Tasks added
 */
router.post('/:projectId/tasks', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'projectId');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists || projectDoc.data()!.userId !== req.userId) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		const { tasks = [] } = req.body;
		if (!Array.isArray(tasks) || tasks.length === 0) {
			res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'tasks array is required' } });
			return;
		}

		const existingTasks = await projectRef.collection('tasks').count().get();
		const startOrder = existingTasks.data().count;

		const now = FieldValue.serverTimestamp();
		const batch = db().batch();
		const taskIds: string[] = [];

		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];
			const taskRef = projectRef.collection('tasks').doc();
			taskIds.push(taskRef.id);

			const hasSchedule = task.scheduledFor && typeof task.scheduledFor === 'string';
			batch.set(taskRef, {
				title: task.title,
				description: task.description || '',
				status: hasSchedule ? 'scheduled' : 'pending',
				order: task.order ?? startOrder + i,
				dependencies: task.dependencies || [],
				scheduledFor: hasSchedule ? new Date(task.scheduledFor) : null,
				result: null,
				errorMessage: null,
				startedAt: null,
				completedAt: null,
				createdAt: now,
				updatedAt: now,
			});
		}

		batch.update(projectRef, {
			totalTasks: FieldValue.increment(tasks.length),
			updatedAt: now,
		});

		await batch.commit();

		console.log(`[tasks] Added ${tasks.length} tasks to project=${projectId}`);
		res.status(201).json({ success: true, data: { taskIds, added: tasks.length } });
	} catch (err) {
		console.error('[tasks] Create error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects/{projectId}/tasks/{taskId}:
 *   patch:
 *     summary: Update a task (status, result, etc.)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, failed, skipped, blocked, scheduled]
 *               result:
 *                 type: string
 *               errorMessage:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledFor:
 *                 type: string
 *                 format: date-time
 *                 description: "ISO datetime to execute this task"
 *     responses:
 *       200:
 *         description: Updated task
 */
router.patch('/:projectId/tasks/:taskId', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'projectId');
		const taskId = param(req, 'taskId');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists || projectDoc.data()!.userId !== req.userId) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		const taskRef = projectRef.collection('tasks').doc(taskId);
		const taskDoc = await taskRef.get();

		if (!taskDoc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
			return;
		}

		const allowedFields = ['status', 'result', 'errorMessage', 'title', 'description'];
		const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
		const oldStatus = taskDoc.data()!.status;

		for (const field of allowedFields) {
			if (req.body[field] !== undefined) {
				updates[field] = req.body[field];
			}
		}

		if (req.body.scheduledFor !== undefined) {
			updates.scheduledFor = req.body.scheduledFor ? new Date(req.body.scheduledFor) : null;
			if (req.body.scheduledFor && !updates.status) {
				updates.status = 'scheduled';
			}
		}

		if (updates.status === 'in_progress' && oldStatus !== 'in_progress') {
			updates.startedAt = FieldValue.serverTimestamp();
		}

		if (
			(updates.status === 'completed' || updates.status === 'failed' || updates.status === 'skipped') &&
			oldStatus !== 'completed' &&
			oldStatus !== 'failed' &&
			oldStatus !== 'skipped'
		) {
			updates.completedAt = FieldValue.serverTimestamp();
		}

		const batch = db().batch();
		batch.update(taskRef, updates);

		if (updates.status === 'completed' && oldStatus !== 'completed') {
			batch.update(projectRef, {
				completedTasks: FieldValue.increment(1),
				updatedAt: FieldValue.serverTimestamp(),
			});
		} else if (oldStatus === 'completed' && updates.status && updates.status !== 'completed') {
			batch.update(projectRef, {
				completedTasks: FieldValue.increment(-1),
				updatedAt: FieldValue.serverTimestamp(),
			});
		}

		await batch.commit();

		if (updates.status) {
			await db().collection('activityLog').add({
				userId: req.userId,
				entityType: 'task',
				entityId: taskId,
				action: `task_${updates.status}`,
				details: {
					projectId,
					taskTitle: taskDoc.data()!.title,
					oldStatus,
					newStatus: updates.status,
				},
				createdAt: FieldValue.serverTimestamp(),
			});
		}

		console.log(`[tasks] Updated task=${taskId} in project=${projectId}: ${JSON.stringify(updates)}`);
		res.json({ success: true, data: { id: taskId, ...updates } });
	} catch (err) {
		console.error('[tasks] Update error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects/{projectId}/tasks/{taskId}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete('/:projectId/tasks/:taskId', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'projectId');
		const taskId = param(req, 'taskId');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists || projectDoc.data()!.userId !== req.userId) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		const taskRef = projectRef.collection('tasks').doc(taskId);
		const taskDoc = await taskRef.get();

		if (!taskDoc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
			return;
		}

		const wasCompleted = taskDoc.data()!.status === 'completed';
		const batch = db().batch();
		batch.delete(taskRef);
		batch.update(projectRef, {
			totalTasks: FieldValue.increment(-1),
			...(wasCompleted ? { completedTasks: FieldValue.increment(-1) } : {}),
			updatedAt: FieldValue.serverTimestamp(),
		});
		await batch.commit();

		console.log(`[tasks] Deleted task=${taskId} from project=${projectId}`);
		res.json({ success: true, data: { id: taskId, deleted: true } });
	} catch (err) {
		console.error('[tasks] Delete error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

export { router as tasksRouter };
