<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import Card from '$lib/components/Card.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	const swaggerUrl = import.meta.env.DEV
		? 'http://localhost:7510/ava-dash/us-central1/api/docs'
		: '/api/docs';
</script>

<PageHeader title="Admin" subtitle="System management" />

<div class="grid gap-3 sm:grid-cols-2">
	<Card href="/admin/api-keys">
		{#snippet children()}
			<div class="flex items-center gap-3">
				<span class="material-symbols-outlined text-accent-400 text-2xl">key</span>
				<div>
					<h3 class="font-medium text-text-primary">API Keys</h3>
					<p class="text-xs text-text-muted">Generate and manage API keys for Claude Code</p>
				</div>
			</div>
		{/snippet}
	</Card>

	<Card>
		{#snippet children()}
			<a href={swaggerUrl} target="_blank" rel="noopener" class="flex items-center gap-3">
				<span class="material-symbols-outlined text-accent-400 text-2xl">api</span>
				<div>
					<h3 class="font-medium text-text-primary">API Documentation</h3>
					<p class="text-xs text-text-muted">Swagger UI — explore and test the API</p>
				</div>
			</a>
		{/snippet}
	</Card>

	<Card>
		{#snippet children()}
			<div class="flex items-center gap-3">
				<span class="material-symbols-outlined text-accent-400 text-2xl">person</span>
				<div>
					<h3 class="font-medium text-text-primary">Profile</h3>
					<p class="text-xs text-text-muted">{authStore.userProfile?.email}</p>
					<p class="text-xs text-text-muted">Role: {authStore.userProfile?.role}</p>
				</div>
			</div>
		{/snippet}
	</Card>

	<Card>
		{#snippet children()}
			<div class="flex items-center gap-3">
				<span class="material-symbols-outlined text-accent-400 text-2xl">info</span>
				<div>
					<h3 class="font-medium text-text-primary">System Info</h3>
					<p class="text-xs text-text-muted">Emulator mode: {import.meta.env.DEV ? 'yes' : 'no'}</p>
					<p class="text-xs text-text-muted">Version: 0.1.0</p>
				</div>
			</div>
		{/snippet}
	</Card>
</div>
