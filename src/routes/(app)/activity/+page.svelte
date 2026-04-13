<script lang="ts">
	import { activityStore } from '$lib/stores/activity.svelte';
	import type { AuditSource } from '$lib/types';
	import Card from '$lib/components/Card.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let sourceFilter = $state<AuditSource | 'all'>('all');

	const filteredEntries = $derived(
		sourceFilter === 'all'
			? activityStore.entries
			: activityStore.entries.filter((e) => e.source === sourceFilter)
	);

	const totalTokensUsed = $derived(
		activityStore.entries.reduce((sum, e) => sum + (e.tokensUsed || 0), 0)
	);

	const latestRemaining = $derived(
		activityStore.entries.find((e) => e.tokensRemaining != null)?.tokensRemaining ?? null
	);

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		return `${Math.floor(hours / 24)}d ago`;
	}

	function actionLabel(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function entityIcon(type: string): string {
		switch (type) {
			case 'project': return 'folder';
			case 'task': return 'task_alt';
			case 'cronJob': return 'schedule';
			case 'system': return 'settings';
			default: return 'info';
		}
	}

	function sourceColor(source: string): string {
		switch (source) {
			case 'cron': return 'bg-status-info/15 text-status-info';
			case 'user_request': return 'bg-accent-400/15 text-accent-400';
			case 'email': return 'bg-status-warning/15 text-status-warning';
			case 'scheduled': return 'bg-accent-400/15 text-accent-400';
			case 'api': return 'bg-status-success/15 text-status-success';
			default: return 'bg-surface-400/30 text-text-muted';
		}
	}

	const sourceFilters: { value: AuditSource | 'all'; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'user_request', label: 'User' },
		{ value: 'email', label: 'Email' },
		{ value: 'cron', label: 'Cron' },
		{ value: 'scheduled', label: 'Scheduled' },
		{ value: 'api', label: 'API' },
		{ value: 'system', label: 'System' }
	];
</script>

<PageHeader title="Audit Log" subtitle="Actions, events, and token usage" />

<!-- Token summary -->
<div class="grid grid-cols-2 gap-3 mb-4">
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Tokens Used (visible)</div>
			<div class="text-2xl font-bold text-text-primary">{totalTokensUsed.toLocaleString()}</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Tokens Remaining</div>
			<div class="text-2xl font-bold {latestRemaining != null && latestRemaining < 10000 ? 'text-status-error' : 'text-text-primary'}">
				{latestRemaining != null ? latestRemaining.toLocaleString() : '—'}
			</div>
		{/snippet}
	</Card>
</div>

<!-- Source filter tabs -->
<div class="flex gap-1 mb-4 overflow-x-auto pb-1">
	{#each sourceFilters as sf}
		<button
			onclick={() => (sourceFilter = sf.value)}
			class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors {sourceFilter === sf.value
				? 'bg-accent-500/20 text-accent-400'
				: 'text-text-muted hover:text-text-secondary hover:bg-surface-200'}"
		>
			{sf.label}
		</button>
	{/each}
</div>

{#if activityStore.loading}
	<div class="text-center py-12 text-text-muted text-sm">Loading audit log...</div>
{:else if filteredEntries.length === 0}
	<Card>
		{#snippet children()}
			<p class="text-text-muted text-sm py-8 text-center">
				{sourceFilter === 'all' ? 'No activity recorded yet.' : `No ${sourceFilter} entries.`}
			</p>
		{/snippet}
	</Card>
{:else}
	<div class="space-y-1">
		{#each filteredEntries as entry}
			<Card>
				{#snippet children()}
					<div class="flex items-start gap-3">
						<span class="material-symbols-outlined text-text-muted text-lg mt-0.5">{entityIcon(entry.entityType)}</span>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2 min-w-0">
									<span class="text-sm text-text-primary font-medium">{actionLabel(entry.action)}</span>
									{#if entry.source && entry.source !== 'system'}
										<span class="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider {sourceColor(entry.source)}">
											{entry.source.replace(/_/g, ' ')}
										</span>
									{/if}
								</div>
								<span class="text-[10px] text-text-muted shrink-0">{timeAgo(entry.createdAt)}</span>
							</div>

							<!-- Token info row -->
							{#if entry.tokensUsed != null || entry.tokensRemaining != null}
								<div class="flex items-center gap-3 mt-1">
									{#if entry.tokensUsed != null}
										<span class="text-xs text-text-muted flex items-center gap-1">
											<span class="material-symbols-outlined text-xs text-accent-400">token</span>
											{entry.tokensUsed.toLocaleString()} used
										</span>
									{/if}
									{#if entry.tokensRemaining != null}
										<span class="text-xs {entry.tokensRemaining < 10000 ? 'text-status-error' : 'text-text-muted'}">
											{entry.tokensRemaining.toLocaleString()} remaining
										</span>
									{/if}
								</div>
							{/if}

							<!-- Context details -->
							{#if entry.details && Object.keys(entry.details).length > 0}
								<div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
									{#each Object.entries(entry.details) as [key, value]}
										<span class="text-xs text-text-muted">
											<span class="text-text-secondary">{key}:</span> {typeof value === 'string' ? value : JSON.stringify(value)}
										</span>
									{/each}
								</div>
							{/if}

							<!-- Linked project/task -->
							{#if entry.projectId}
								<div class="mt-1">
									<a href="/projects/{entry.projectId}" class="text-xs text-accent-400 hover:text-accent-500 transition-colors">
										View project
									</a>
								</div>
							{/if}
						</div>
					</div>
				{/snippet}
			</Card>
		{/each}
	</div>
{/if}
