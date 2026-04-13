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
 * /cron-jobs:
 *   get:
 *     summary: List cron jobs
 *     tags: [Cron Jobs]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, paused, disabled]
 *     responses:
 *       200:
 *         description: List of cron jobs
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
 *                     $ref: '#/components/schemas/CronJob'
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const statusFilter = req.query.status as string | undefined;
		let query = db()
			.collection('cronJobs')
			.where('userId', '==', req.userId)
			.orderBy('updatedAt', 'desc') as FirebaseFirestore.Query;

		if (statusFilter) {
			query = db()
				.collection('cronJobs')
				.where('userId', '==', req.userId)
				.where('status', '==', statusFilter)
				.orderBy('updatedAt', 'desc');
		}

		const snapshot = await query.get();
		const jobs = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
			lastRunAt: toISO(doc.data().lastRunAt),
			nextRunAt: toISO(doc.data().nextRunAt),
			createdAt: toISO(doc.data().createdAt),
			updatedAt: toISO(doc.data().updatedAt),
		}));

		console.log(`[cronJobs] Listed ${jobs.length} cron jobs for user=${req.userId}`);
		res.json({ success: true, data: jobs });
	} catch (err) {
		console.error('[cronJobs] List error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /cron-jobs:
 *   post:
 *     summary: Create a cron job
 *     tags: [Cron Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, schedule]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               schedule:
 *                 type: string
 *                 description: Cron expression (e.g. "0 * * * *")
 *               status:
 *                 type: string
 *                 enum: [active, paused]
 *                 default: active
 *     responses:
 *       201:
 *         description: Created cron job
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { name, description, schedule, status = 'active' } = req.body;

		if (!name || !schedule) {
			res.status(400).json({
				success: false,
				error: { code: 'VALIDATION', message: 'name and schedule are required' },
			});
			return;
		}

		const now = FieldValue.serverTimestamp();
		const docRef = await db().collection('cronJobs').add({
			userId: req.userId,
			name,
			description: description || '',
			schedule,
			status,
			lastRunAt: null,
			lastResult: null,
			nextRunAt: null,
			createdAt: now,
			updatedAt: now,
		});

		await db().collection('activityLog').add({
			userId: req.userId,
			entityType: 'cronJob',
			entityId: docRef.id,
			action: 'cron_created',
			details: { name, schedule },
			createdAt: FieldValue.serverTimestamp(),
		});

		console.log(`[cronJobs] Created cronJob=${docRef.id} for user=${req.userId}`);
		res.status(201).json({
			success: true,
			data: { id: docRef.id, name, description, schedule, status },
		});
	} catch (err) {
		console.error('[cronJobs] Create error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /cron-jobs/{id}:
 *   patch:
 *     summary: Update a cron job
 *     tags: [Cron Jobs]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               schedule:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, paused, disabled]
 *               lastRunAt:
 *                 type: string
 *                 format: date-time
 *               lastResult:
 *                 type: string
 *               nextRunAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Updated cron job
 */
router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const cronId = param(req, 'id');
		const docRef = db().collection('cronJobs').doc(cronId);
		const doc = await docRef.get();

		if (!doc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cron job not found' } });
			return;
		}

		if (doc.data()!.userId !== req.userId) {
			res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
			return;
		}

		const allowedFields = ['name', 'description', 'schedule', 'status', 'lastRunAt', 'lastResult', 'nextRunAt'];
		const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

		for (const field of allowedFields) {
			if (req.body[field] !== undefined) {
				if ((field === 'lastRunAt' || field === 'nextRunAt') && typeof req.body[field] === 'string') {
					updates[field] = new Date(req.body[field]);
				} else {
					updates[field] = req.body[field];
				}
			}
		}

		await docRef.update(updates);

		console.log(`[cronJobs] Updated cronJob=${cronId}`);
		res.json({ success: true, data: { id: cronId, ...updates } });
	} catch (err) {
		console.error('[cronJobs] Update error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /cron-jobs/{id}:
 *   delete:
 *     summary: Delete a cron job
 *     tags: [Cron Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cron job deleted
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const cronId = param(req, 'id');
		const docRef = db().collection('cronJobs').doc(cronId);
		const doc = await docRef.get();

		if (!doc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Cron job not found' } });
			return;
		}

		if (doc.data()!.userId !== req.userId) {
			res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
			return;
		}

		await docRef.delete();

		console.log(`[cronJobs] Deleted cronJob=${cronId}`);
		res.json({ success: true, data: { id: cronId, deleted: true } });
	} catch (err) {
		console.error('[cronJobs] Delete error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

export { router as cronJobsRouter };
