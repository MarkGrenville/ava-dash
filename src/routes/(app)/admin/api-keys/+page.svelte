<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { API_BASE } from '$lib/firebase/client';
	import type { ApiKey, ApiResponse } from '$lib/types';
	import Card from '$lib/components/Card.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let keys = $state<ApiKey[]>([]);
	let loading = $state(true);
	let newKeyName = $state('');
	let newKeyExpiry = $state<number | null>(null);
	let creating = $state(false);
	let generatedKey = $state<string | null>(null);
	let errorMsg = $state('');

	async function authHeaders(): Promise<HeadersInit> {
		const token = await authStore.getIdToken();
		return {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		};
	}

	async function loadKeys() {
		try {
			const res = await fetch(`${API_BASE}/api-keys`, { headers: await authHeaders() });
			const json: ApiResponse<ApiKey[]> = await res.json();
			if (json.success && json.data) {
				keys = json.data;
			}
		} catch (err) {
			console.error('[api-keys] Failed to load:', err);
		} finally {
			loading = false;
		}
	}

	async function createKey() {
		if (!newKeyName.trim()) return;
		creating = true;
		errorMsg = '';
		generatedKey = null;

		try {
			const res = await fetch(`${API_BASE}/api-keys`, {
				method: 'POST',
				headers: await authHeaders(),
				body: JSON.stringify({
					name: newKeyName.trim(),
					expiresInDays: newKeyExpiry
				})
			});
			const json = await res.json();
			if (json.success) {
				generatedKey = json.data.key;
				newKeyName = '';
				newKeyExpiry = null;
				await loadKeys();
			} else {
				errorMsg = json.error?.message || 'Failed to create key';
			}
		} catch (err) {
			errorMsg = (err as Error).message;
		} finally {
			creating = false;
		}
	}

	async function revokeKey(id: string) {
		try {
			await fetch(`${API_BASE}/api-keys/${id}/revoke`, {
				method: 'POST',
				headers: await authHeaders()
			});
			await loadKeys();
		} catch (err) {
			console.error('[api-keys] Revoke failed:', err);
		}
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('en-ZA', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	onMount(loadKeys);
</script>

<div class="mb-4">
	<a href="/admin" class="text-xs text-text-muted hover:text-text-secondary transition-colors">&larr; Back to Admin</a>
</div>

<PageHeader title="API Keys" subtitle="Manage API keys for Claude Code authentication" />

<!-- Create new key -->
<Card class="mb-6">
	{#snippet children()}
		<h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Generate New Key</h3>
		<div class="flex flex-col sm:flex-row gap-3">
			<input
				type="text"
				bind:value={newKeyName}
				placeholder="Key name (e.g. Claude Code)"
				class="flex-1 bg-surface-200 border border-surface-400 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
			/>
			<select
				bind:value={newKeyExpiry}
				class="bg-surface-200 border border-surface-400 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500"
			>
				<option value={null}>No expiry</option>
				<option value={30}>30 days</option>
				<option value={90}>90 days</option>
				<option value={365}>1 year</option>
			</select>
			<button
				onclick={createKey}
				disabled={creating || !newKeyName.trim()}
				class="bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
			>
				{creating ? 'Creating...' : 'Generate Key'}
			</button>
		</div>

		{#if errorMsg}
			<p class="text-status-error text-sm mt-2">{errorMsg}</p>
		{/if}

		{#if generatedKey}
			<div class="mt-4 p-3 bg-status-success/10 border border-status-success/20 rounded-lg">
				<p class="text-xs text-status-success font-semibold mb-1">Key generated — copy it now. It won't be shown again.</p>
				<code class="block text-sm text-text-primary font-mono break-all bg-surface-200 rounded p-2 select-all">
					{generatedKey}
				</code>
			</div>
		{/if}
	{/snippet}
</Card>

<!-- Existing keys -->
{#if loading}
	<div class="text-center py-8 text-text-muted text-sm">Loading keys...</div>
{:else if keys.length === 0}
	<Card>
		{#snippet children()}
			<p class="text-text-muted text-sm py-4 text-center">No API keys created yet.</p>
		{/snippet}
	</Card>
{:else}
	<div class="space-y-2">
		{#each keys as key}
			<Card>
				{#snippet children()}
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-text-muted text-lg">key</span>
								<h3 class="font-medium text-text-primary">{key.name}</h3>
								<StatusBadge status={key.status} />
							</div>
							<div class="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
								<span>Prefix: <code class="font-mono">{key.keyPrefix}...</code></span>
								<span>Created: {formatDate(key.createdAt)}</span>
								{#if key.expiresAt}
									<span>Expires: {formatDate(key.expiresAt)}</span>
								{/if}
								{#if key.lastUsedAt}
									<span>Last used: {formatDate(key.lastUsedAt)}</span>
								{/if}
							</div>
						</div>
						{#if key.status === 'active'}
							<button
								onclick={() => revokeKey(key.id)}
								class="text-xs text-status-error hover:text-status-error/80 font-medium px-3 py-1.5 rounded-lg hover:bg-status-error/10 transition-colors"
							>
								Revoke
							</button>
						{/if}
					</div>
				{/snippet}
			</Card>
		{/each}
	</div>
{/if}
