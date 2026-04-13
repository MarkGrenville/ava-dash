<script>
	import '../app.css';
	let { children } = $props();
</script>

<div class="min-h-screen bg-surface-50 text-text-primary font-sans">
	{@render children()}
</div>
