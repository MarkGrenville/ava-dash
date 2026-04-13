<script lang="ts">
	interface Props {
		title: string;
		subtitle?: string;
	}

	let { title, subtitle }: Props = $props();
</script>

<div class="mb-6">
	<h1 class="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
	{#if subtitle}
		<p class="mt-1 text-sm text-text-secondary">{subtitle}</p>
	{/if}
</div>
