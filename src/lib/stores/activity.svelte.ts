import { db } from '$lib/firebase/client';
import {
	collection,
	query,
	where,
	orderBy,
	limit,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
import type { ActivityLogEntry } from '$lib/types';

let entries = $state<ActivityLogEntry[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);

let unsubscribe: Unsubscribe | null = null;

function subscribe(userId: string, maxEntries = 50) {
	if (unsubscribe) unsubscribe();

	loading = true;
	error = null;

	const q = query(
		collection(db, 'activityLog'),
		where('userId', '==', userId),
		orderBy('createdAt', 'desc'),
		limit(maxEntries)
	);

	unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			entries = snapshot.docs.map((doc) => {
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
					createdAt: data.createdAt?.toDate?.().toISOString() || ''
				} as ActivityLogEntry;
			});
			loading = false;
			console.log(`[activity] Snapshot: ${entries.length} entries`);
		},
		(err) => {
			error = err.message;
			loading = false;
			console.error('[activity] Snapshot error:', err);
		}
	);
}

function destroy() {
	if (unsubscribe) {
		unsubscribe();
		unsubscribe = null;
	}
	entries = [];
}

export const activityStore = {
	get entries() {
		return entries;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	subscribe,
	destroy
};
