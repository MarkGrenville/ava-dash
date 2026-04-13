<script lang="ts">
	import { projectsStore } from '$lib/stores/projects.svelte';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { ProjectStatus } from '$lib/types';

	let filter = $state<ProjectStatus | 'all'>('all');

	const filteredProjects = $derived(
		filter === 'all'
			? projectsStore.projects
			: projectsStore.projects.filter((p) => p.status === filter)
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

	const statusFilters: { value: ProjectStatus | 'all'; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'active', label: 'Active' },
		{ value: 'planning', label: 'Planning' },
		{ value: 'paused', label: 'Paused' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'failed', label: 'Failed' }
	];
</script>

<PageHeader title="Projects" subtitle="{projectsStore.projects.length} total projects" />

<!-- Filter tabs -->
<div class="flex gap-1 mb-4 overflow-x-auto pb-1">
	{#each statusFilters as sf}
		<button
			onclick={() => (filter = sf.value)}
			class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors {filter === sf.value
				? 'bg-accent-500/20 text-accent-400'
				: 'text-text-muted hover:text-text-secondary hover:bg-surface-200'}"
		>
			{sf.label}
		</button>
	{/each}
</div>

{#if projectsStore.loading}
	<div class="text-center py-12 text-text-muted text-sm">Loading projects...</div>
{:else if filteredProjects.length === 0}
	<Card>
		{#snippet children()}
			<p class="text-text-muted text-sm py-8 text-center">
				{filter === 'all' ? 'No projects yet. Claude will create them via the API.' : `No ${filter} projects.`}
			</p>
		{/snippet}
	</Card>
{:else}
	<div class="space-y-2">
		{#each filteredProjects as project}
			<Card href="/projects/{project.id}">
				{#snippet children()}
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2 flex-wrap">
								<h3 class="font-medium text-text-primary">{project.title}</h3>
								<StatusBadge status={project.status} />
							</div>
							{#if project.description}
								<p class="text-xs text-text-muted mt-1 line-clamp-2">{project.description}</p>
							{/if}
							<div class="flex items-center gap-3 mt-2 text-[10px] text-text-muted uppercase tracking-wider">
								<span>{project.completedTasks}/{project.totalTasks} tasks</span>
								<span>Updated {timeAgo(project.updatedAt)}</span>
							</div>
						</div>
						{#if project.totalTasks > 0}
							<div class="shrink-0 w-16 flex flex-col items-end gap-1">
								<span class="text-xs font-semibold text-text-primary">
									{Math.round((project.completedTasks / project.totalTasks) * 100)}%
								</span>
								<div class="w-full h-1 bg-surface-300 rounded-full overflow-hidden">
									<div
										class="h-full bg-accent-500 rounded-full"
										style="width: {(project.completedTasks / project.totalTasks) * 100}%"
									></div>
								</div>
							</div>
						{/if}
					</div>
				{/snippet}
			</Card>
		{/each}
	</div>
{/if}
