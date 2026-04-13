import { Router, Response } from 'express';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { AuthenticatedRequest, param } from '../middleware/auth.js';

const router = Router();
const db = () => getFirestore();

function toISO(ts: Timestamp | null | undefined): string | null {
	return ts ? ts.toDate().toISOString() : null;
}

function generateApiKey(): string {
	return `avk_${crypto.randomBytes(32).toString('hex')}`;
}

function hashApiKey(key: string): string {
	return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * @swagger
 * /api-keys:
 *   get:
 *     summary: List API keys (metadata only, no secrets)
 *     tags: [API Keys]
 *     responses:
 *       200:
 *         description: List of API keys
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
 *                     $ref: '#/components/schemas/ApiKey'
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const snapshot = await db()
			.collection('apiKeys')
			.where('userId', '==', req.userId)
			.orderBy('createdAt', 'desc')
			.get();

		const keys = snapshot.docs.map((doc) => ({
			id: doc.id,
			userId: doc.data().userId,
			name: doc.data().name,
			keyPrefix: doc.data().keyPrefix,
			lastUsedAt: toISO(doc.data().lastUsedAt),
			createdAt: toISO(doc.data().createdAt),
			expiresAt: toISO(doc.data().expiresAt),
			status: doc.data().status,
		}));

		console.log(`[apiKeys] Listed ${keys.length} keys for user=${req.userId}`);
		res.json({ success: true, data: keys });
	} catch (err) {
		console.error('[apiKeys] List error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: Generate a new API key (returns raw key once)
 *     tags: [API Keys]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Display name for the key
 *               expiresInDays:
 *                 type: integer
 *                 description: Days until expiration (null for no expiry)
 *     responses:
 *       201:
 *         description: Created API key with raw key value
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     key:
 *                       type: string
 *                       description: Raw API key — shown only once
 *                     keyPrefix:
 *                       type: string
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { name, expiresInDays } = req.body;

		if (!name) {
			res.status(400).json({
				success: false,
				error: { code: 'VALIDATION', message: 'name is required' },
			});
			return;
		}

		const rawKey = generateApiKey();
		const keyHash = hashApiKey(rawKey);
		const keyPrefix = rawKey.substring(0, 12);

		const expiresAt = expiresInDays
			? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
			: null;

		const docRef = await db().collection('apiKeys').add({
			userId: req.userId,
			name,
			keyHash,
			keyPrefix,
			lastUsedAt: null,
			createdAt: FieldValue.serverTimestamp(),
			expiresAt,
			status: 'active',
		});

		await db().collection('activityLog').add({
			userId: req.userId,
			entityType: 'system',
			entityId: docRef.id,
			action: 'api_key_created',
			details: { name, keyPrefix },
			createdAt: FieldValue.serverTimestamp(),
		});

		console.log(`[apiKeys] Created key=${docRef.id} prefix=${keyPrefix} for user=${req.userId}`);
		res.status(201).json({
			success: true,
			data: {
				id: docRef.id,
				name,
				key: rawKey,
				keyPrefix,
				expiresAt: expiresAt?.toISOString() || null,
			},
		});
	} catch (err) {
		console.error('[apiKeys] Create error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

/**
 * @swagger
 * /api-keys/{id}/revoke:
 *   post:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key revoked
 */
router.post('/:id/revoke', async (req: AuthenticatedRequest, res: Response) => {
	try {
		const keyId = param(req, 'id');
		const docRef = db().collection('apiKeys').doc(keyId);
		const doc = await docRef.get();

		if (!doc.exists) {
			res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
			return;
		}

		if (doc.data()!.userId !== req.userId) {
			res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
			return;
		}

		await docRef.update({ status: 'revoked' });

		console.log(`[apiKeys] Revoked key=${keyId}`);
		res.json({ success: true, data: { id: keyId, status: 'revoked' } });
	} catch (err) {
		console.error('[apiKeys] Revoke error:', err);
		res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
	}
});

export { router as apiKeysRouter };
