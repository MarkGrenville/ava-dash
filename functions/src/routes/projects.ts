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
 * /projects:
 *   get:
 *     summary: List projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, paused, completed, failed]
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of projects
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
 *                     $ref: '#/components/schemas/Project'
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const status = req.query.status as string | undefined;
		const maxLimit = Math.min(parseInt(req.query.limit as string || '50', 10) || 50, 200);

		let query = db()
			.collection('projects')
			.where('userId', '==', req.userId)
			.orderBy('updatedAt', 'desc')
			.limit(maxLimit) as FirebaseFirestore.Query;

		if (status) {
			query = db()
				.collection('projects')
				.where('userId', '==', req.userId)
				.where('status', '==', status)
				.orderBy('updatedAt', 'desc')
				.limit(maxLimit);
		}

		const snapshot = await query.get();
		const projects = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
			createdAt: toISO(doc.data().createdAt),
			updatedAt: toISO(doc.data().updatedAt),
			completedAt: toISO(doc.data().completedAt),
		}));

		console.log(`[projects] Listed ${projects.length} projects for user=${req.userId}`);
		res.json({ success: true, data: projects });
	} catch (err) {
		console.error('[projects] List error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project with tasks
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project with tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Project'
 *                     - type: object
 *                       properties:
 *                         tasks:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Task'
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'id');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		const projectData = projectDoc.data()!;
		if (projectData.userId !== req.userId) {
			res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
			return;
		}

		const tasksSnapshot = await projectRef.collection('tasks').orderBy('order', 'asc').get();
		const tasks = tasksSnapshot.docs.map((doc) => ({
			id: doc.id,
			projectId,
			...doc.data(),
			startedAt: toISO(doc.data().startedAt),
			completedAt: toISO(doc.data().completedAt),
			createdAt: toISO(doc.data().createdAt),
			updatedAt: toISO(doc.data().updatedAt),
		}));

		console.log(`[projects] Get project=${projectId} with ${tasks.length} tasks`);
		res.json({
			success: true,
			data: {
				id: projectDoc.id,
				...projectData,
				createdAt: toISO(projectData.createdAt),
				updatedAt: toISO(projectData.updatedAt),
				completedAt: toISO(projectData.completedAt),
				tasks,
			},
		});
	} catch (err) {
		console.error('[projects] Get error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create project with optional inline tasks
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planning, active]
 *                 default: planning
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
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
 *                     dependencies:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Created project
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { title, description, status = 'planning', metadata = {}, tasks = [] } = req.body;

		if (!title) {
			res.status(400).json({ success: false, error: { code: 'VALIDATION', message: 'title is required' } });
			return;
		}

		const now = FieldValue.serverTimestamp();
		const projectRef = db().collection('projects').doc();
		const projectData = {
			userId: req.userId,
			title,
			description: description || '',
			status,
			totalTasks: tasks.length,
			completedTasks: 0,
			metadata,
			createdAt: now,
			updatedAt: now,
			completedAt: null,
		};

		const batch = db().batch();
		batch.set(projectRef, projectData);

		const taskIds: string[] = [];
		for (let i = 0; i < tasks.length; i++) {
			const task = tasks[i];
			const taskRef = projectRef.collection('tasks').doc();
			taskIds.push(taskRef.id);
			batch.set(taskRef, {
				title: task.title,
				description: task.description || '',
				status: 'pending',
				order: task.order ?? i,
				dependencies: task.dependencies || [],
				result: null,
				errorMessage: null,
				startedAt: null,
				completedAt: null,
				createdAt: now,
				updatedAt: now,
			});
		}

		await batch.commit();

		// Log activity
		await db().collection('activityLog').add({
			userId: req.userId,
			entityType: 'project',
			entityId: projectRef.id,
			action: 'project_created',
			details: { title, taskCount: tasks.length },
			createdAt: FieldValue.serverTimestamp(),
		});

		console.log(`[projects] Created project=${projectRef.id} with ${tasks.length} tasks for user=${req.userId}`);
		res.status(201).json({
			success: true,
			data: {
				id: projectRef.id,
				...projectData,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				taskIds,
			},
		});
	} catch (err) {
		console.error('[projects] Create error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     summary: Update project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [planning, active, paused, completed, failed]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated project
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'id');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		if (projectDoc.data()!.userId !== req.userId) {
			res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
			return;
		}

		const allowedFields = ['title', 'description', 'status', 'metadata'];
		const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

		for (const field of allowedFields) {
			if (req.body[field] !== undefined) {
				updates[field] = req.body[field];
			}
		}

		if (updates.status === 'completed') {
			updates.completedAt = FieldValue.serverTimestamp();
		}

		await projectRef.update(updates);

		await db().collection('activityLog').add({
			userId: req.userId,
			entityType: 'project',
			entityId: projectId,
			action: 'project_updated',
			details: { fields: Object.keys(updates).filter((k) => k !== 'updatedAt') },
			createdAt: FieldValue.serverTimestamp(),
		});

		console.log(`[projects] Updated project=${projectId}`);
		res.json({ success: true, data: { id: projectId, ...updates } });
	} catch (err) {
		console.error('[projects] Update error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete project and all tasks
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const projectId = param(req, 'id');
		const projectRef = db().collection('projects').doc(projectId);
		const projectDoc = await projectRef.get();

		if (!projectDoc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
			return;
		}

		if (projectDoc.data()!.userId !== req.userId) {
			res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
			return;
		}

		const tasksSnapshot = await projectRef.collection('tasks').get();
		const batch = db().batch();
		tasksSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
		batch.delete(projectRef);
		await batch.commit();

		console.log(`[projects] Deleted project=${projectId} with ${tasksSnapshot.size} tasks`);
		res.json({ success: true, data: { id: projectId, deleted: true } });
	} catch (err) {
		console.error('[projects] Delete error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

export { router as projectsRouter };
