import { db } from '$lib/firebase/client';
import {
	collection,
	query,
	where,
	orderBy,
	onSnapshot,
	type Unsubscribe
} from 'firebase/firestore';
import type { Project } from '$lib/types';

let projects = $state<Project[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);

let unsubscribe: Unsubscribe | null = null;

const activeProjects = $derived(projects.filter((p) => p.status === 'active'));
const planningProjects = $derived(projects.filter((p) => p.status === 'planning'));
const completedProjects = $derived(projects.filter((p) => p.status === 'completed'));

function subscribe(userId: string) {
	if (unsubscribe) unsubscribe();

	loading = true;
	error = null;

	const q = query(
		collection(db, 'projects'),
		where('userId', '==', userId),
		orderBy('updatedAt', 'desc')
	);

	unsubscribe = onSnapshot(
		q,
		(snapshot) => {
			projects = snapshot.docs.map((doc) => {
				const data = doc.data();
				return {
					id: doc.id,
					userId: data.userId,
					title: data.title,
					description: data.description,
					status: data.status,
					totalTasks: data.totalTasks || 0,
					completedTasks: data.completedTasks || 0,
					metadata: data.metadata || {},
					createdAt: data.createdAt?.toDate?.().toISOString() || '',
					updatedAt: data.updatedAt?.toDate?.().toISOString() || '',
					completedAt: data.completedAt?.toDate?.().toISOString() || null
				} as Project;
			});
			loading = false;
			console.log(`[projects] Snapshot: ${projects.length} projects`);
		},
		(err) => {
			error = err.message;
			loading = false;
			console.error('[projects] Snapshot error:', err);
		}
	);
}

function destroy() {
	if (unsubscribe) {
		unsubscribe();
		unsubscribe = null;
	}
	projects = [];
}

export const projectsStore = {
	get projects() {
		return projects;
	},
	get activeProjects() {
		return activeProjects;
	},
	get planningProjects() {
		return planningProjects;
	},
	get completedProjects() {
		return completedProjects;
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
