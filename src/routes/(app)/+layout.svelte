<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { projectsStore } from '$lib/stores/projects.svelte';
	import { cronJobsStore } from '$lib/stores/cronJobs.svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import { scheduledTasksStore } from '$lib/stores/scheduledTasks.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';

	let { children } = $props();

	onMount(() => {
		let cancelled = false;

		(async () => {
			while (authStore.loading && !cancelled) {
				await new Promise((r) => setTimeout(r, 100));
			}
			if (cancelled) return;

			if (!authStore.isAuthenticated) {
				goto('/login', { replaceState: true });
				return;
			}

			const uid = authStore.currentUser!.uid;
			projectsStore.subscribe(uid);
			cronJobsStore.subscribe(uid);
			activityStore.subscribe(uid);
			scheduledTasksStore.startPolling();
		})();

		return () => {
			cancelled = true;
			projectsStore.destroy();
			cronJobsStore.destroy();
			activityStore.destroy();
			scheduledTasksStore.stopPolling();
		};
	});
</script>

<TopBar />
<main class="pb-20 md:pb-6 px-4 pt-4 max-w-5xl mx-auto">
	{@render children()}
</main>
<BottomNav />
