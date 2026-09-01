<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
	<main class="w-full max-w-lg">
		{@render children()}
	</main>
</div>
