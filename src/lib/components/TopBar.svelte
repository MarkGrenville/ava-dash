<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';

	const initials = $derived(
		authStore.userProfile?.displayName
			?.split(' ')
			.map((n: string) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '?'
	);
</script>

<header class="sticky top-0 z-40 bg-surface-100/80 backdrop-blur-md border-b border-surface-300">
	<div class="flex items-center justify-between px-4 h-14">
		<div class="flex items-center gap-3">
			<a href="/dashboard" class="flex items-center gap-2">
				<span class="text-accent-400 font-bold text-lg tracking-tight">AVA</span>
				<span class="text-text-muted text-xs font-medium uppercase tracking-widest hidden sm:block">Dashboard</span>
			</a>
		</div>

		<nav class="hidden md:flex items-center gap-1">
			<a href="/dashboard" class="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-200 transition-colors">
				Dashboard
			</a>
			<a href="/projects" class="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-200 transition-colors">
				Projects
			</a>
			<a href="/cron" class="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-200 transition-colors">
				Cron Jobs
			</a>
			<a href="/activity" class="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-200 transition-colors">
				Activity
			</a>
		</nav>

		<div class="flex items-center gap-3">
			<a href="/admin" class="text-text-muted hover:text-text-secondary transition-colors" title="Admin">
				<span class="material-symbols-outlined text-xl">settings</span>
			</a>
			<button
				onclick={() => authStore.signOut()}
				class="w-8 h-8 rounded-full bg-accent-500/20 text-accent-400 text-xs font-bold flex items-center justify-center hover:bg-accent-500/30 transition-colors"
				title="Sign out"
			>
				{initials}
			</button>
		</div>
	</div>
</header>
