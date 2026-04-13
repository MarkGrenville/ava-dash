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
 * /activity:
 *   get:
 *     summary: Get audit log
 *     tags: [Activity]
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [project, task, cronJob, system]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [cron, user_request, email, api, system, scheduled]
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by associated project
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Audit log entries
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
 *                     $ref: '#/components/schemas/ActivityLogEntry'
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const entityType = req.query.entityType as string | undefined;
		const entityId = req.query.entityId as string | undefined;
		const source = req.query.source as string | undefined;
		const projectId = req.query.projectId as string | undefined;
		const maxLimit = Math.min(parseInt(req.query.limit as string || '50', 10) || 50, 200);

		let baseRef = db().collection('activityLog');
		let query: FirebaseFirestore.Query = baseRef
			.where('userId', '==', req.userId)
			.orderBy('createdAt', 'desc')
			.limit(maxLimit);

		if (entityType) {
			query = baseRef
				.where('userId', '==', req.userId)
				.where('entityType', '==', entityType)
				.orderBy('createdAt', 'desc')
				.limit(maxLimit);
		} else if (entityId) {
			query = baseRef
				.where('userId', '==', req.userId)
				.where('entityId', '==', entityId)
				.orderBy('createdAt', 'desc')
				.limit(maxLimit);
		} else if (source) {
			query = baseRef
				.where('userId', '==', req.userId)
				.where('source', '==', source)
				.orderBy('createdAt', 'desc')
				.limit(maxLimit);
		} else if (projectId) {
			query = baseRef
				.where('userId', '==', req.userId)
				.where('projectId', '==', projectId)
				.orderBy('createdAt', 'desc')
				.limit(maxLimit);
		}

		const snapshot = await query.get();
		const entries = snapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				userId: data.userId,
				entityType: data.entityType,
				entityId: data.entityId,
				action: data.action,
				source: data.source || 'system',
				projectId: data.projectId || null,
				taskId: data.taskId || null,
				tokensUsed: data.tokensUsed ?? null,
				tokensRemaining: data.tokensRemaining ?? null,
				details: data.details || {},
				createdAt: toISO(data.createdAt),
			};
		});

		console.log(`[activity] Listed ${entries.length} entries for user=${req.userId}`);
		res.json({ success: true, data: entries });
	} catch (err) {
		console.error('[activity] List error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /activity:
 *   post:
 *     summary: Log an audit entry
 *     description: Ava uses this to record what it did, token usage, and what initiated the action.
 *     tags: [Activity]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, source]
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [project, task, cronJob, system]
 *                 default: system
 *               entityId:
 *                 type: string
 *               action:
 *                 type: string
 *                 description: "What happened (e.g. 'task_completed', 'research_performed', 'email_sent')"
 *               source:
 *                 type: string
 *                 enum: [cron, user_request, email, api, system, scheduled]
 *                 description: What initiated this action
 *               projectId:
 *                 type: string
 *                 description: Associated project ID
 *               taskId:
 *                 type: string
 *                 description: Associated task ID
 *               tokensUsed:
 *                 type: integer
 *                 description: Tokens consumed by this action
 *               tokensRemaining:
 *                 type: integer
 *                 description: Remaining token budget after this action
 *               details:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Any additional context
 *     responses:
 *       201:
 *         description: Audit entry created
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { action, source, entityType = 'system', entityId = '', projectId, taskId, tokensUsed, tokensRemaining, details = {} } = req.body;

		if (!action || !source) {
			res.status(400).json({
				success: false,
				error: { code: 'VALIDATION', message: 'action and source are required' },
			});
			return;
		}

		const entry = {
			userId: req.userId,
			entityType,
			entityId: entityId || '',
			action,
			source,
			projectId: projectId || null,
			taskId: taskId || null,
			tokensUsed: tokensUsed ?? null,
			tokensRemaining: tokensRemaining ?? null,
			details,
			createdAt: FieldValue.serverTimestamp(),
		};

		const docRef = await db().collection('activityLog').add(entry);

		console.log(`[activity] Created audit entry=${docRef.id} action=${action} source=${source} tokens=${tokensUsed ?? 'n/a'}`);
		res.status(201).json({
			success: true,
			data: { id: docRef.id, action, source, tokensUsed, tokensRemaining },
		});
	} catch (err) {
		console.error('[activity] Create error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

export { router as activityRouter };
