<script lang="ts">
	import { page } from '$app/state';

	const navItems = [
		{ href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
		{ href: '/projects', icon: 'folder', label: 'Projects' },
		{ href: '/cron', icon: 'schedule', label: 'Cron' },
		{ href: '/activity', icon: 'history', label: 'Activity' },
		{ href: '/admin', icon: 'settings', label: 'Admin' }
	];

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		if (href === '/dashboard') return path === '/dashboard';
		return path.startsWith(href);
	}
</script>

<nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-100/90 backdrop-blur-md border-t border-surface-300 safe-area-bottom">
	<div class="flex items-center justify-around h-16 px-2">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors {isActive(item.href)
					? 'text-accent-400'
					: 'text-text-muted hover:text-text-secondary'}"
			>
				<span class="material-symbols-outlined text-xl">{item.icon}</span>
				<span class="text-[10px] font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
