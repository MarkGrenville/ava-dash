<script lang="ts">
	import { page } from '$app/state';
	import { onMount, onDestroy } from 'svelte';
	import { db } from '$lib/firebase/client';
	import {
		doc,
		collection,
		onSnapshot,
		orderBy,
		query,
		type Unsubscribe
	} from 'firebase/firestore';
	import type { Project, Task } from '$lib/types';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let project = $state<Project | null>(null);
	let tasks = $state<Task[]>([]);
	let loading = $state(true);

	let unsubProject: Unsubscribe;
	let unsubTasks: Unsubscribe;

	const projectId = $derived(page.params.id as string);

	const progress = $derived(
		project && project.totalTasks > 0
			? Math.round((project.completedTasks / project.totalTasks) * 100)
			: 0
	);

	const activeTask = $derived(tasks.find((t) => t.status === 'in_progress'));

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-ZA', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const statusOrder: Record<string, number> = {
		in_progress: 0,
		scheduled: 1,
		pending: 2,
		blocked: 3,
		completed: 4,
		failed: 5,
		skipped: 6
	};

	const sortedTasks = $derived(
		[...tasks].sort((a, b) => {
			const sa = statusOrder[a.status] ?? 99;
			const sb = statusOrder[b.status] ?? 99;
			if (sa !== sb) return sa - sb;
			return a.order - b.order;
		})
	);

	onMount(() => {
		const projectRef = doc(db, 'projects', projectId);
		unsubProject = onSnapshot(projectRef, (snap) => {
			if (snap.exists()) {
				const data = snap.data();
				project = {
					id: snap.id,
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
				};
			}
			loading = false;
		});

		const tasksQuery = query(collection(db, 'projects', projectId, 'tasks'), orderBy('order', 'asc'));
		unsubTasks = onSnapshot(tasksQuery, (snap) => {
			tasks = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					projectId,
					title: data.title,
					description: data.description,
					status: data.status,
					order: data.order,
					dependencies: data.dependencies || [],
					result: data.result || null,
					errorMessage: data.errorMessage || null,
					scheduledFor: data.scheduledFor?.toDate?.().toISOString() || null,
					startedAt: data.startedAt?.toDate?.().toISOString() || null,
					completedAt: data.completedAt?.toDate?.().toISOString() || null,
					createdAt: data.createdAt?.toDate?.().toISOString() || '',
					updatedAt: data.updatedAt?.toDate?.().toISOString() || ''
				} as Task;
			});
		});
	});

	onDestroy(() => {
		unsubProject?.();
		unsubTasks?.();
	});
</script>

{#if loading}
	<div class="text-center py-12 text-text-muted text-sm">Loading project...</div>
{:else if !project}
	<div class="text-center py-12 text-text-muted text-sm">Project not found.</div>
{:else}
	<div class="mb-4">
		<a href="/projects" class="text-xs text-text-muted hover:text-text-secondary transition-colors">&larr; Back to Projects</a>
	</div>

	<PageHeader title={project.title} subtitle={project.description || undefined} />

	<!-- Project meta -->
	<div class="flex items-center gap-3 mb-4 flex-wrap">
		<StatusBadge status={project.status} size="md" />
		<span class="text-xs text-text-muted">{project.completedTasks}/{project.totalTasks} tasks completed</span>
		{#if project.updatedAt}
			<span class="text-xs text-text-muted">Updated {formatDate(project.updatedAt)}</span>
		{/if}
	</div>

	<!-- Progress bar -->
	{#if project.totalTasks > 0}
		<div class="mb-6">
			<div class="flex items-center justify-between mb-1">
				<span class="text-[10px] text-text-muted uppercase tracking-widest font-semibold">Progress</span>
				<span class="text-xs font-semibold text-text-primary">{progress}%</span>
			</div>
			<div class="h-2 bg-surface-300 rounded-full overflow-hidden">
				<div
					class="h-full bg-accent-500 rounded-full transition-all duration-500"
					style="width: {progress}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Currently active task highlight -->
	{#if activeTask}
		<Card class="mb-4 border-accent-500/30 bg-accent-500/5">
			{#snippet children()}
				<div class="flex items-center gap-2 mb-1">
					<span class="material-symbols-outlined text-accent-400 text-base animate-pulse">play_circle</span>
					<span class="text-[10px] text-accent-400 font-semibold uppercase tracking-widest">Currently Working On</span>
				</div>
				<h3 class="font-medium text-text-primary">{activeTask.title}</h3>
				{#if activeTask.description}
					<p class="text-xs text-text-muted mt-1">{activeTask.description}</p>
				{/if}
			{/snippet}
		</Card>
	{/if}

	<!-- Task list -->
	<section>
		<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
			Tasks ({tasks.length})
		</h2>

		{#if tasks.length === 0}
			<Card>
				{#snippet children()}
					<p class="text-text-muted text-sm py-4 text-center">No tasks added yet.</p>
				{/snippet}
			</Card>
		{:else}
			<div class="space-y-1.5">
				{#each sortedTasks as task, i}
					<Card>
						{#snippet children()}
							<div class="flex items-start gap-3">
								<div class="shrink-0 mt-0.5">
									{#if task.status === 'completed'}
										<span class="material-symbols-outlined text-status-success text-lg">check_circle</span>
									{:else if task.status === 'in_progress'}
										<span class="material-symbols-outlined text-status-warning text-lg animate-pulse">pending</span>
									{:else if task.status === 'scheduled'}
										<span class="material-symbols-outlined text-accent-400 text-lg">schedule_send</span>
									{:else if task.status === 'failed'}
										<span class="material-symbols-outlined text-status-error text-lg">error</span>
									{:else if task.status === 'blocked'}
										<span class="material-symbols-outlined text-status-error text-lg">block</span>
									{:else if task.status === 'skipped'}
										<span class="material-symbols-outlined text-text-muted text-lg">skip_next</span>
									{:else}
										<span class="material-symbols-outlined text-text-muted text-lg">radio_button_unchecked</span>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium text-text-primary {task.status === 'completed' || task.status === 'skipped' ? 'line-through opacity-60' : ''}">
											{task.title}
										</span>
										<StatusBadge status={task.status} />
									</div>
									{#if task.description}
										<p class="text-xs text-text-muted mt-0.5">{task.description}</p>
									{/if}
									{#if task.result}
										<div class="mt-2 text-xs text-text-secondary bg-surface-200 rounded-lg p-2 font-mono whitespace-pre-wrap">
											{task.result}
										</div>
									{/if}
									{#if task.errorMessage}
										<div class="mt-2 text-xs text-status-error bg-status-error/10 rounded-lg p-2 font-mono">
											{task.errorMessage}
										</div>
									{/if}
									<div class="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
										{#if task.scheduledFor}
											<span class="flex items-center gap-1 {task.status === 'scheduled' ? 'text-accent-400' : ''}">
												<span class="material-symbols-outlined text-xs">schedule</span>
												Scheduled for {formatDate(task.scheduledFor)}
											</span>
										{/if}
										{#if task.startedAt}
											<span>Started {formatDate(task.startedAt)}</span>
										{/if}
										{#if task.completedAt}
											<span>Finished {formatDate(task.completedAt)}</span>
										{/if}
									</div>
								</div>
							</div>
						{/snippet}
					</Card>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Metadata -->
	{#if project.metadata && Object.keys(project.metadata).length > 0}
		<section class="mt-6">
			<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Metadata</h2>
			<Card>
				{#snippet children()}
					<pre class="text-xs text-text-secondary font-mono whitespace-pre-wrap overflow-x-auto">{JSON.stringify(project?.metadata, null, 2)}</pre>
				{/snippet}
			</Card>
		</section>
	{/if}
{/if}
