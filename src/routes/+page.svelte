<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/login', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center min-h-screen">
	<div class="animate-pulse text-text-secondary">Loading...</div>
</div>
