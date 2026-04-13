<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte';
	import { projectsStore } from '$lib/stores/projects.svelte';
	import { cronJobsStore } from '$lib/stores/cronJobs.svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import { scheduledTasksStore } from '$lib/stores/scheduledTasks.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();
	let subscribed = false;

	$effect(() => {
		const user = authStore.currentUser;
		if (user && !subscribed) {
			subscribed = true;
			console.log('[layout] Subscribing stores for uid:', user.uid);
			projectsStore.subscribe(user.uid);
			cronJobsStore.subscribe(user.uid);
			activityStore.subscribe(user.uid);
			scheduledTasksStore.startPolling();
		}

		if (!authStore.loading && !user) {
			console.log('[layout] Not authenticated, redirecting to login');
			goto('/login', { replaceState: true });
		}
	});
</script>

<TopBar />
<main class="pb-20 md:pb-6 px-4 pt-4 max-w-7xl mx-auto">
	{@render children()}
</main>
<BottomNav />
