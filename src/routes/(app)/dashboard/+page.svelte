<script lang="ts">
	import { projectsStore } from '$lib/stores/projects.svelte';
	import { cronJobsStore } from '$lib/stores/cronJobs.svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import { scheduledTasksStore } from '$lib/stores/scheduledTasks.svelte';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	const currentTask = $derived.by(() => {
		for (const project of projectsStore.activeProjects) {
			if (project.tasks) {
				const active = project.tasks.find((t) => t.status === 'in_progress');
				if (active) return { project, task: active };
			}
		}
		return null;
	});

	function timeAgo(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	function formatScheduledDate(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = d.getTime() - now.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 60) return `in ${diffMins}m`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `in ${diffHours}h`;
		return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
	}

	function actionLabel(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}
</script>

<PageHeader title="Dashboard" subtitle="Overview of Ava's current activity" />

<!-- Stats row -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Active Projects</div>
			<div class="text-2xl font-bold text-text-primary">{projectsStore.activeProjects.length}</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Planning</div>
			<div class="text-2xl font-bold text-text-primary">{projectsStore.planningProjects.length}</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Cron Jobs</div>
			<div class="text-2xl font-bold text-text-primary">{cronJobsStore.activeCronJobs.length}</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Completed</div>
			<div class="text-2xl font-bold text-text-primary">{projectsStore.completedProjects.length}</div>
		{/snippet}
	</Card>
</div>

<!-- Active projects -->
<section class="mb-6">
	<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Active Projects</h2>
	{#if projectsStore.activeProjects.length === 0}
		<Card>
			{#snippet children()}
				<p class="text-text-muted text-sm py-4 text-center">No active projects. Ava is idle.</p>
			{/snippet}
		</Card>
	{:else}
		<div class="space-y-2">
			{#each projectsStore.activeProjects as project}
				<Card href="/projects/{project.id}">
					{#snippet children()}
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<h3 class="font-medium text-text-primary truncate">{project.title}</h3>
									<StatusBadge status={project.status} />
								</div>
								<p class="text-xs text-text-muted mt-0.5 truncate">{project.description || 'No description'}</p>
							</div>
							<div class="text-right shrink-0">
								<div class="text-sm font-semibold text-text-primary">{project.completedTasks}/{project.totalTasks}</div>
								<div class="text-[10px] text-text-muted uppercase">tasks</div>
							</div>
						</div>
						{#if project.totalTasks > 0}
							<div class="mt-3 h-1.5 bg-surface-300 rounded-full overflow-hidden">
								<div
									class="h-full bg-accent-500 rounded-full transition-all"
									style="width: {(project.completedTasks / project.totalTasks) * 100}%"
								></div>
							</div>
						{/if}
					{/snippet}
				</Card>
			{/each}
		</div>
	{/if}
</section>

<!-- Upcoming scheduled tasks -->
{#if scheduledTasksStore.upcoming.length > 0}
	<section class="mb-6">
		<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Upcoming Scheduled Tasks</h2>
		<div class="space-y-1.5">
			{#each scheduledTasksStore.upcoming.slice(0, 5) as task}
				<Card href="/projects/{task.projectId}">
					{#snippet children()}
						<div class="flex items-start gap-3">
							<span class="material-symbols-outlined text-accent-400 text-lg mt-0.5">schedule_send</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center justify-between gap-2">
									<span class="text-sm font-medium text-text-primary truncate">{task.title}</span>
									<span class="text-[10px] text-accent-400 shrink-0">{formatScheduledDate(task.scheduledFor)}</span>
								</div>
								<span class="text-xs text-text-muted">{task.projectTitle}</span>
							</div>
						</div>
					{/snippet}
				</Card>
			{/each}
		</div>
	</section>
{/if}

<!-- Audit log -->
<section>
	<div class="flex items-center justify-between mb-3">
		<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Audit Log</h2>
		<a href="/activity" class="text-xs text-accent-400 hover:text-accent-500 transition-colors">View all</a>
	</div>
	{#if activityStore.entries.length === 0}
		<Card>
			{#snippet children()}
				<p class="text-text-muted text-sm py-4 text-center">No activity yet.</p>
			{/snippet}
		</Card>
	{:else}
		<Card>
			{#snippet children()}
				<div class="divide-y divide-surface-300">
					{#each activityStore.entries.slice(0, 10) as entry}
						<div class="py-2.5 first:pt-0 last:pb-0">
							<div class="flex items-center justify-between gap-3">
								<div class="min-w-0 flex-1 flex items-center gap-2">
									<span class="text-sm text-text-primary">{actionLabel(entry.action)}</span>
									{#if entry.source && entry.source !== 'system'}
										<span class="text-[9px] px-1.5 py-0.5 rounded bg-surface-300 text-text-muted uppercase tracking-wider">{entry.source}</span>
									{/if}
								</div>
								<span class="text-[10px] text-text-muted shrink-0">{timeAgo(entry.createdAt)}</span>
							</div>
							<div class="flex items-center gap-3 mt-0.5">
								{#if entry.details?.taskTitle}
									<span class="text-xs text-text-muted">{entry.details.taskTitle}</span>
								{/if}
								{#if entry.tokensUsed != null}
									<span class="text-[10px] text-text-muted">
										<span class="text-accent-400">{entry.tokensUsed.toLocaleString()}</span> tokens
									</span>
								{/if}
								{#if entry.tokensRemaining != null}
									<span class="text-[10px] text-text-muted">
										{entry.tokensRemaining.toLocaleString()} remaining
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/snippet}
		</Card>
	{/if}
</section>
