import { db } from '$lib/firebase/client';
import {
	collection,
	query,
	where,
	orderBy,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
import type { CronJob } from '$lib/types';

let cronJobs = $state<CronJob[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);

let unsubscribe: Unsubscribe | null = null;

const activeCronJobs = $derived(cronJobs.filter((j) => j.status === 'active'));

function subscribe(userId: string) {
	if (unsubscribe) unsubscribe();

	loading = true;
	error = null;

	const q = query(
		collection(db, 'cronJobs'),
		where('userId', '==', userId),
		orderBy('updatedAt', 'desc')
	);

	unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			cronJobs = snapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					userId: data.userId,
					name: data.name,
					description: data.description,
					schedule: data.schedule,
					status: data.status,
					lastRunAt: data.lastRunAt?.toDate?.().toISOString() || null,
					lastResult: data.lastResult || null,
					nextRunAt: data.nextRunAt?.toDate?.().toISOString() || null,
					createdAt: data.createdAt?.toDate?.().toISOString() || '',
					updatedAt: data.updatedAt?.toDate?.().toISOString() || ''
				} as CronJob;
			});
			loading = false;
			console.log(`[cronJobs] Snapshot: ${cronJobs.length} cron jobs`);
		},
		(err) => {
			error = err.message;
			loading = false;
			console.error('[cronJobs] Snapshot error:', err);
		}
	);
}

function destroy() {
	if (unsubscribe) {
		unsubscribe();
		unsubscribe = null;
	}
	cronJobs = [];
}

export const cronJobsStore = {
	get cronJobs() {
		return cronJobs;
	},
	get activeCronJobs() {
		return activeCronJobs;
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
