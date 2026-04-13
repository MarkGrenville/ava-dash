<script lang="ts">
	import { page } from '$app/state';
	import { db } from '$lib/firebase/client';
	import {
		doc,
		collection,
		onSnapshot,
		orderBy,
		query,
		where,
		limit,
		type Unsubscribe
	} from 'firebase/firestore';
	import type { Project, Task, ActivityLogEntry } from '$lib/types';
	import { authStore } from '$lib/stores/auth.svelte';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let project = $state<Project | null>(null);
	let tasks = $state<Task[]>([]);
	let auditEntries = $state<ActivityLogEntry[]>([]);
	let loading = $state(true);

	const projectId = $derived(page.params.id as string);

	const progress = $derived(
		project && project.totalTasks > 0
			? Math.round((project.completedTasks / project.totalTasks) * 100)
			: 0
	);

	const activeTask = $derived(tasks.find((t) => t.status === 'in_progress'));

	const taskStats = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;
		return counts;
	});

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleString('en-ZA', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

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

	const sourceColors: Record<string, string> = {
		cron: 'bg-status-info/15 text-status-info',
		user_request: 'bg-accent-400/15 text-accent-400',
		email: 'bg-status-warning/15 text-status-warning',
		api: 'bg-status-success/15 text-status-success',
		system: 'bg-surface-400/30 text-text-muted',
		scheduled: 'bg-accent-400/15 text-accent-400'
	};

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

	$effect(() => {
		const id = projectId;
		if (!id) return;

		loading = true;
		project = null;
		tasks = [];
		auditEntries = [];

		let unsubProject: Unsubscribe | undefined;
		let unsubTasks: Unsubscribe | undefined;
		let unsubAudit: Unsubscribe | undefined;

		const projectRef = doc(db, 'projects', id);
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
			} else {
				project = null;
			}
			loading = false;
		}, (err) => {
			console.error('[project] Snapshot error:', err);
			loading = false;
		});

		const tasksQuery = query(collection(db, 'projects', id, 'tasks'), orderBy('order', 'asc'));
		unsubTasks = onSnapshot(tasksQuery, (snap) => {
			tasks = snap.docs.map((d) => {
				const data = d.data();
				return {
					id: d.id,
					projectId: id,
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
		}, (err) => {
			console.error('[tasks] Snapshot error:', err);
		});

		const user = authStore.currentUser;
		if (user) {
			const auditQuery = query(
				collection(db, 'activityLog'),
				where('userId', '==', user.uid),
				where('projectId', '==', id),
				orderBy('createdAt', 'desc'),
				limit(30)
			);
			unsubAudit = onSnapshot(auditQuery, (snap) => {
				auditEntries = snap.docs.map((d) => {
					const data = d.data();
					return {
						id: d.id,
						userId: data.userId,
						entityType: data.entityType,
						entityId: data.entityId,
						action: data.action,
						source: data.source || 'system',
						projectId: data.projectId || null,
						taskId: data.taskId || null,
						tokensUsed: data.tokensUsed ?? null,
						tokensRemaining: data.tokensRemaining ?? null,
						details: data.details || {},
						createdAt: data.createdAt?.toDate?.().toISOString() || ''
					} as ActivityLogEntry;
				});
			}, (err) => {
				console.error('[project-audit] Snapshot error:', err);
			});
		}

		return () => {
			unsubProject?.();
			unsubTasks?.();
			unsubAudit?.();
		};
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

	<div class="flex items-center gap-3 mb-4 flex-wrap">
		<StatusBadge status={project.status} size="md" />
		<span class="text-xs text-text-muted">{project.completedTasks}/{project.totalTasks} tasks completed</span>
		{#if project.updatedAt}
			<span class="text-xs text-text-muted">Updated {formatDate(project.updatedAt)}</span>
		{/if}
	</div>

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
			{#if Object.keys(taskStats).length > 0}
				<div class="flex items-center gap-3 mt-2 flex-wrap">
					{#each Object.entries(taskStats) as [status, count]}
						<span class="flex items-center gap-1 text-[10px] text-text-muted">
							<StatusBadge status={status} />
							<span class="font-semibold">{count}</span>
						</span>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Two-column layout -->
	<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

		<!-- Left: tasks (2/3) -->
		<div class="xl:col-span-2">
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
						{#each sortedTasks as task}
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
		</div>

		<!-- Right: audit log (1/3) -->
		<div>
			<section>
				<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
					Project Activity ({auditEntries.length})
				</h2>

				{#if auditEntries.length === 0}
					<Card>
						{#snippet children()}
							<p class="text-text-muted text-sm py-4 text-center">No activity recorded for this project.</p>
						{/snippet}
					</Card>
				{:else}
					<Card>
						{#snippet children()}
							<div class="divide-y divide-surface-300">
								{#each auditEntries as entry}
									<div class="py-2.5 first:pt-0 last:pb-0">
										<div class="flex items-center justify-between gap-2">
											<span class="text-xs text-text-primary truncate">{actionLabel(entry.action)}</span>
											<span class="text-[10px] text-text-muted shrink-0">{timeAgo(entry.createdAt)}</span>
										</div>
										<div class="flex items-center gap-2 mt-1 flex-wrap">
											{#if entry.source && entry.source !== 'system'}
												<span class="text-[8px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider {sourceColors[entry.source] || 'bg-surface-300 text-text-muted'}">{entry.source.replace(/_/g, ' ')}</span>
											{/if}
											{#if entry.details?.taskTitle}
												<span class="text-[10px] text-text-muted truncate">{entry.details.taskTitle}</span>
											{/if}
										</div>
										{#if entry.tokensUsed != null}
											<div class="text-[10px] text-text-muted mt-0.5">
												<span class="text-accent-400 font-medium">{entry.tokensUsed.toLocaleString()}</span> tokens
												{#if entry.tokensRemaining != null}
													· {entry.tokensRemaining.toLocaleString()} remaining
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
		</div>
	</div>
{/if}
