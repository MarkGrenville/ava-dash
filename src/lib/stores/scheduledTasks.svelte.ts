import { API_BASE, auth } from '$lib/firebase/client';

interface UpcomingTask {
	id: string;
	projectId: string;
	projectTitle: string;
	title: string;
	description: string;
	status: string;
	scheduledFor: string;
	createdAt: string;
}

let upcoming = $state<UpcomingTask[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

let refreshTimer: ReturnType<typeof setInterval> | null = null;

async function fetchUpcoming() {
	const user = auth.currentUser;
	if (!user) return;

	loading = true;
	error = null;

	try {
		const token = await user.getIdToken();
		const res = await fetch(`${API_BASE}/tasks/upcoming?limit=10`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		const json = await res.json();
		if (json.success) {
			upcoming = json.data;
		} else {
			error = json.error?.message || 'Failed to fetch';
		}
	} catch (err) {
		error = (err as Error).message;
		console.error('[scheduledTasks] Fetch error:', err);
	} finally {
		loading = false;
	}
}

function startPolling(intervalMs = 60000) {
	fetchUpcoming();
	if (refreshTimer) clearInterval(refreshTimer);
	refreshTimer = setInterval(fetchUpcoming, intervalMs);
}

function stopPolling() {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}
	upcoming = [];
}

export const scheduledTasksStore = {
	get upcoming() {
		return upcoming;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	fetchUpcoming,
	startPolling,
	stopPolling
};
