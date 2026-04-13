<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		href?: string;
	}

	let { children, class: className = '', href }: Props = $props();
</script>

{#if href}
	<a {href} class="block bg-surface-100 rounded-xl border border-surface-300 p-4 hover:border-surface-400 hover:bg-surface-200/50 transition-all {className}">
		{@render children()}
	</a>
{:else}
	<div class="bg-surface-100 rounded-xl border border-surface-300 p-4 {className}">
		{@render children()}
	</div>
{/if}
