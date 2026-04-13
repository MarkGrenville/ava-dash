import { Request, Response, NextFunction } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
	userId?: string;
	authMethod?: 'apiKey' | 'firebaseToken';
}

export function param(req: Request, name: string): string {
	return req.params[name] as string;
}

function hashApiKey(key: string): string {
	return crypto.createHash('sha256').update(key).digest('hex');
}

export async function authMiddleware(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
): Promise<void> {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		res.status(401).json({
			success: false,
			error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
		});
		return;
	}

	const token = authHeader.slice(7);

	// Try API key auth first (shorter tokens, hex format)
	try {
		const keyHash = hashApiKey(token);
		const db = getFirestore();
		const snapshot = await db
			.collection('apiKeys')
			.where('keyHash', '==', keyHash)
			.where('status', '==', 'active')
			.limit(1)
			.get();

		if (!snapshot.empty) {
			const keyDoc = snapshot.docs[0];
			const keyData = keyDoc.data();

			if (keyData.expiresAt && keyData.expiresAt.toDate() < new Date()) {
				res.status(401).json({
					success: false,
					error: { code: 'KEY_EXPIRED', message: 'API key has expired' },
				});
				return;
			}

			req.userId = keyData.userId;
			req.authMethod = 'apiKey';

			keyDoc.ref.update({ lastUsedAt: new Date() }).catch((err: Error) => {
				console.error('[auth] Failed to update lastUsedAt:', err.message);
			});

			console.log(`[auth] API key auth success: user=${req.userId} key=${keyData.keyPrefix}...`);
			next();
			return;
		}
	} catch (err) {
		console.log('[auth] API key lookup failed, trying Firebase token...', (err as Error).message);
	}

	// Try Firebase ID token
	try {
		const decodedToken = await getAuth().verifyIdToken(token);
		req.userId = decodedToken.uid;
		req.authMethod = 'firebaseToken';
		console.log(`[auth] Firebase token auth success: user=${req.userId}`);
		next();
		return;
	} catch (err) {
		console.log('[auth] Firebase token verification failed:', (err as Error).message);
	}

	res.status(401).json({
		success: false,
		error: { code: 'UNAUTHORIZED', message: 'Invalid API key or Firebase token' },
	});
}
