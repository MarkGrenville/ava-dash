<script lang="ts">
	import type { ProjectStatus, TaskStatus, CronJobStatus, ApiKeyStatus } from '$lib/types';

	type BadgeStatus = ProjectStatus | TaskStatus | CronJobStatus | ApiKeyStatus;

	interface Props {
		status: BadgeStatus;
		size?: 'sm' | 'md';
	}

	let { status, size = 'sm' }: Props = $props();

	const colorMap: Record<string, string> = {
		active: 'bg-status-success/15 text-status-success',
		completed: 'bg-status-success/15 text-status-success',
		planning: 'bg-status-info/15 text-status-info',
		in_progress: 'bg-status-warning/15 text-status-warning',
		pending: 'bg-surface-400/30 text-text-secondary',
		paused: 'bg-status-warning/15 text-status-warning',
		failed: 'bg-status-error/15 text-status-error',
		blocked: 'bg-status-error/15 text-status-error',
		scheduled: 'bg-accent-400/15 text-accent-400',
		skipped: 'bg-surface-400/30 text-text-muted',
		disabled: 'bg-surface-400/30 text-text-muted',
		revoked: 'bg-status-error/15 text-status-error'
	};

	const label = $derived(status.replace(/_/g, ' '));
	const classes = $derived(colorMap[status] || 'bg-surface-400/30 text-text-secondary');
	const sizeClasses = $derived(size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1');
</script>

<span class="inline-flex items-center rounded-full font-semibold uppercase tracking-wider {classes} {sizeClasses}">
	{label}
</span>
