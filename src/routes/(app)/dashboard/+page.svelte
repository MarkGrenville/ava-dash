<script lang="ts">
	import { projectsStore } from '$lib/stores/projects.svelte';
	import { cronJobsStore } from '$lib/stores/cronJobs.svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import { scheduledTasksStore } from '$lib/stores/scheduledTasks.svelte';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	const totalTasks = $derived(
		projectsStore.projects.reduce((sum, p) => sum + p.totalTasks, 0)
	);
	const completedTasks = $derived(
		projectsStore.projects.reduce((sum, p) => sum + p.completedTasks, 0)
	);
	const inProgressTasks = $derived(totalTasks - completedTasks);

	const totalTokensUsed = $derived(
		activityStore.entries.reduce((sum, e) => sum + (e.tokensUsed ?? 0), 0)
	);
	const latestRemaining = $derived.by(() => {
		for (const e of activityStore.entries) {
			if (e.tokensRemaining != null) return e.tokensRemaining;
		}
		return null;
	});
	const tokenBurnRate = $derived.by(() => {
		const recent = activityStore.entries.filter(e => e.tokensUsed != null && e.tokensUsed > 0).slice(0, 20);
		if (recent.length < 2) return null;
		const total = recent.reduce((s, e) => s + (e.tokensUsed ?? 0), 0);
		return Math.round(total / recent.length);
	});

	const recentProjects = $derived(
		[...projectsStore.projects]
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
			.slice(0, 8)
	);

	const sourceBreakdown = $derived.by(() => {
		const map: Record<string, number> = {};
		for (const e of activityStore.entries) {
			map[e.source] = (map[e.source] || 0) + 1;
		}
		return Object.entries(map).sort(([, a], [, b]) => b - a);
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

	const sourceColors: Record<string, string> = {
		cron: 'bg-status-info/15 text-status-info',
		user_request: 'bg-accent-400/15 text-accent-400',
		email: 'bg-status-warning/15 text-status-warning',
		api: 'bg-status-success/15 text-status-success',
		system: 'bg-surface-400/30 text-text-muted',
		scheduled: 'bg-accent-400/15 text-accent-400'
	};
</script>

<!-- Header -->
<div class="flex items-center justify-between mb-6">
	<div>
		<h1 class="text-2xl font-bold tracking-tight text-text-primary">Dashboard</h1>
		<p class="mt-0.5 text-sm text-text-secondary">Ava operational overview</p>
	</div>
	<div class="flex items-center gap-2">
		{#if projectsStore.activeProjects.length > 0}
			<span class="flex items-center gap-1.5 text-xs text-status-success bg-status-success/10 px-3 py-1.5 rounded-full font-medium">
				<span class="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse"></span>
				Active
			</span>
		{:else}
			<span class="flex items-center gap-1.5 text-xs text-text-muted bg-surface-200 px-3 py-1.5 rounded-full font-medium">
				<span class="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
				Idle
			</span>
		{/if}
	</div>
</div>

<!-- Stats row -->
<div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Active Projects</div>
			<div class="text-2xl font-bold text-text-primary">{projectsStore.activeProjects.length}</div>
			<div class="text-[10px] text-text-muted mt-0.5">{projectsStore.planningProjects.length} planning</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Total Tasks</div>
			<div class="text-2xl font-bold text-text-primary">{totalTasks}</div>
			<div class="text-[10px] text-text-muted mt-0.5">{completedTasks} done · {inProgressTasks} remaining</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Cron Jobs</div>
			<div class="text-2xl font-bold text-text-primary">{cronJobsStore.activeCronJobs.length}</div>
			<div class="text-[10px] text-text-muted mt-0.5">{cronJobsStore.cronJobs.length} total</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Completed</div>
			<div class="text-2xl font-bold text-status-success">{projectsStore.completedProjects.length}</div>
			<div class="text-[10px] text-text-muted mt-0.5">projects finished</div>
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Tokens Used</div>
			<div class="text-2xl font-bold text-accent-400">{totalTokensUsed.toLocaleString()}</div>
			{#if tokenBurnRate}
				<div class="text-[10px] text-text-muted mt-0.5">~{tokenBurnRate.toLocaleString()} avg/action</div>
			{/if}
		{/snippet}
	</Card>
	<Card>
		{#snippet children()}
			<div class="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-1">Tokens Remaining</div>
			{#if latestRemaining != null}
				<div class="text-2xl font-bold {latestRemaining < 50000 ? 'text-status-error' : latestRemaining < 200000 ? 'text-status-warning' : 'text-status-success'}">
					{latestRemaining.toLocaleString()}
				</div>
				<div class="text-[10px] text-text-muted mt-0.5">last reported</div>
			{:else}
				<div class="text-2xl font-bold text-text-muted">—</div>
				<div class="text-[10px] text-text-muted mt-0.5">not yet reported</div>
			{/if}
		{/snippet}
	</Card>
</div>

<!-- Two-column layout for wider screens -->
<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

	<!-- Left column: 2/3 width -->
	<div class="xl:col-span-2 space-y-6">

		<!-- Active Projects -->
		<section>
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Active Projects</h2>
				<a href="/projects" class="text-xs text-accent-400 hover:text-accent-500 transition-colors">View all</a>
			</div>
			{#if projectsStore.activeProjects.length === 0}
				<Card>
					{#snippet children()}
						<p class="text-text-muted text-sm py-6 text-center">No active projects. Ava is idle.</p>
					{/snippet}
				</Card>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
					{#each projectsStore.activeProjects.slice(0, 6) as project}
						<Card href="/projects/{project.id}">
							{#snippet children()}
								<div class="flex items-center justify-between gap-3 mb-2">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<h3 class="font-medium text-text-primary truncate text-sm">{project.title}</h3>
											<StatusBadge status={project.status} />
										</div>
									</div>
									<div class="text-right shrink-0">
										<div class="text-sm font-semibold text-text-primary">{project.completedTasks}/{project.totalTasks}</div>
									</div>
								</div>
								{#if project.description}
									<p class="text-xs text-text-muted truncate mb-2">{project.description}</p>
								{/if}
								{#if project.totalTasks > 0}
									<div class="h-1.5 bg-surface-300 rounded-full overflow-hidden">
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

		<!-- Planning & Recently Updated -->
		{#if projectsStore.planningProjects.length > 0}
			<section>
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Planning</h2>
					<a href="/projects" class="text-xs text-accent-400 hover:text-accent-500 transition-colors">View all</a>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
					{#each projectsStore.planningProjects.slice(0, 4) as project}
						<Card href="/projects/{project.id}">
							{#snippet children()}
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-medium text-text-primary truncate text-sm">{project.title}</h3>
									<StatusBadge status={project.status} />
								</div>
								<p class="text-xs text-text-muted truncate">{project.description || 'No description'}</p>
								<div class="text-[10px] text-text-muted mt-1.5">{project.totalTasks} tasks planned</div>
							{/snippet}
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Cron Jobs -->
		<section>
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">Cron Jobs</h2>
				<a href="/cron" class="text-xs text-accent-400 hover:text-accent-500 transition-colors">View all</a>
			</div>
			{#if cronJobsStore.cronJobs.length === 0}
				<Card>
					{#snippet children()}
						<p class="text-text-muted text-sm py-4 text-center">No cron jobs registered.</p>
					{/snippet}
				</Card>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
					{#each cronJobsStore.cronJobs.slice(0, 6) as job}
						<Card>
							{#snippet children()}
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2">
											<h3 class="text-sm font-medium text-text-primary truncate">{job.name}</h3>
											<StatusBadge status={job.status} />
										</div>
										<div class="flex items-center gap-3 mt-1.5">
											<span class="text-[10px] text-text-muted font-mono">{job.schedule}</span>
											<span class="text-[10px] text-text-muted">Last: {timeAgo(job.lastRunAt ?? '')}</span>
										</div>
									</div>
									<div class="shrink-0">
										{#if job.status === 'active'}
											<span class="material-symbols-outlined text-status-success text-lg">play_circle</span>
										{:else}
											<span class="material-symbols-outlined text-text-muted text-lg">pause_circle</span>
										{/if}
									</div>
								</div>
							{/snippet}
						</Card>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Right column: 1/3 width -->
	<div class="space-y-6">

		<!-- Upcoming Scheduled Tasks -->
		{#if scheduledTasksStore.upcoming.length > 0}
			<section>
				<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Scheduled</h2>
				<div class="space-y-1.5">
					{#each scheduledTasksStore.upcoming.slice(0, 5) as task}
						<Card href="/projects/{task.projectId}">
							{#snippet children()}
								<div class="flex items-start gap-2.5">
									<span class="material-symbols-outlined text-accent-400 text-base mt-0.5">schedule_send</span>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-2">
											<span class="text-sm font-medium text-text-primary truncate">{task.title}</span>
											<span class="text-[10px] text-accent-400 shrink-0 font-medium">{formatScheduledDate(task.scheduledFor)}</span>
										</div>
										<span class="text-[10px] text-text-muted">{task.projectTitle}</span>
									</div>
								</div>
							{/snippet}
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Activity Source Breakdown -->
		{#if sourceBreakdown.length > 0}
			<section>
				<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Activity Sources</h2>
				<Card>
					{#snippet children()}
						<div class="space-y-2">
							{#each sourceBreakdown as [source, count]}
								<div class="flex items-center justify-between">
									<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider {sourceColors[source] || 'bg-surface-300 text-text-muted'}">{source.replace(/_/g, ' ')}</span>
									<span class="text-sm font-semibold text-text-primary">{count}</span>
								</div>
							{/each}
						</div>
					{/snippet}
				</Card>
			</section>
		{/if}

		<!-- Audit Log -->
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
							{#each activityStore.entries.slice(0, 15) as entry}
								<div class="py-2 first:pt-0 last:pb-0">
									<div class="flex items-center justify-between gap-2">
										<div class="min-w-0 flex-1 flex items-center gap-1.5">
											<span class="text-xs text-text-primary truncate">{actionLabel(entry.action)}</span>
											{#if entry.source && entry.source !== 'system'}
												<span class="text-[8px] px-1 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0 {sourceColors[entry.source] || 'bg-surface-300 text-text-muted'}">{entry.source}</span>
											{/if}
										</div>
										<span class="text-[10px] text-text-muted shrink-0">{timeAgo(entry.createdAt)}</span>
									</div>
									{#if entry.tokensUsed != null || entry.details?.taskTitle}
										<div class="flex items-center gap-2 mt-0.5">
											{#if entry.details?.taskTitle}
												<span class="text-[10px] text-text-muted truncate">{entry.details.taskTitle}</span>
											{/if}
											{#if entry.tokensUsed != null}
												<span class="text-[10px] text-accent-400 shrink-0">{entry.tokensUsed.toLocaleString()} tok</span>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/snippet}
				</Card>
			{/if}
		</section>

		<!-- Recently Updated -->
		{#if recentProjects.length > 0}
			<section>
				<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Recently Updated</h2>
				<div class="space-y-1">
					{#each recentProjects.slice(0, 5) as project}
						<a href="/projects/{project.id}" class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-surface-200/50 transition-colors group">
							<div class="min-w-0 flex-1 flex items-center gap-2">
								<span class="text-xs font-medium text-text-primary truncate group-hover:text-accent-400 transition-colors">{project.title}</span>
								<StatusBadge status={project.status} />
							</div>
							<span class="text-[10px] text-text-muted shrink-0">{timeAgo(project.updatedAt)}</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>
