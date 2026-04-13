<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';

	let { children } = $props();

	$effect(() => {
		if (!authStore.loading && !authStore.profileLoading && !authStore.isAdmin) {
			goto('/dashboard', { replaceState: true });
		}
	});
</script>

{#if authStore.isAdmin}
	{@render children()}
{:else}
	<div class="flex items-center justify-center py-20">
		<p class="text-text-muted text-sm">Checking access...</p>
	</div>
{/if}
