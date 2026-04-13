<script lang="ts">
	import { cronJobsStore } from '$lib/stores/cronJobs.svelte';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let activeOnly = $state(true);

	const visibleJobs = $derived(
		activeOnly ? cronJobsStore.activeCronJobs : cronJobsStore.cronJobs
	);

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-ZA', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function timeAgo(iso: string | null): string {
		if (!iso) return 'never';
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}
</script>

<PageHeader
	title="Cron Jobs"
	subtitle="{cronJobsStore.activeCronJobs.length} active · {cronJobsStore.cronJobs.length} total"
/>

<!-- Active-only toggle -->
<div class="flex items-center justify-end mb-4">
	<button
		onclick={() => (activeOnly = !activeOnly)}
		class="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
	>
		<span class:text-text-muted={!activeOnly}>Active only</span>
		<div class="relative w-8 h-4 rounded-full transition-colors {activeOnly ? 'bg-accent-500' : 'bg-surface-400'}">
			<div class="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all {activeOnly ? 'left-4' : 'left-0.5'}"></div>
		</div>
	</button>
</div>

{#if cronJobsStore.loading}
	<div class="text-center py-12 text-text-muted text-sm">Loading cron jobs...</div>
{:else if visibleJobs.length === 0}
	<Card>
		{#snippet children()}
			<p class="text-text-muted text-sm py-8 text-center">
				{activeOnly ? 'No active cron jobs.' : 'No cron jobs registered.'}
			</p>
		{/snippet}
	</Card>
{:else}
	<div class="space-y-2">
		{#each visibleJobs as job}
			<Card>
				{#snippet children()}
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<h3 class="font-medium text-text-primary">{job.name}</h3>
								<StatusBadge status={job.status} />
							</div>
							{#if job.description}
								<p class="text-xs text-text-muted mt-1">{job.description}</p>
							{/if}
							<div class="flex items-center gap-4 mt-2">
								<span class="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-wider">
									<span class="material-symbols-outlined text-xs">schedule</span>
									{job.schedule}
								</span>
								<span class="text-[10px] text-text-muted">
									Last run: {timeAgo(job.lastRunAt)}
								</span>
							</div>
						</div>
						<div class="shrink-0 text-right">
							{#if job.status === 'active'}
								<span class="material-symbols-outlined text-status-success text-xl">play_circle</span>
							{:else if job.status === 'paused'}
								<span class="material-symbols-outlined text-status-warning text-xl">pause_circle</span>
							{:else}
								<span class="material-symbols-outlined text-text-muted text-xl">cancel</span>
							{/if}
						</div>
					</div>
					{#if job.lastResult}
						<div class="mt-3 text-xs text-text-secondary bg-surface-200 rounded-lg p-2 font-mono whitespace-pre-wrap">
							{job.lastResult}
						</div>
					{/if}
				{/snippet}
			</Card>
		{/each}
	</div>
{/if}
