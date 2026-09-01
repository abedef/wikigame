<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
	<main class="w-full max-w-lg">
		{@render children()}
	</main>

	<!--
		The interface is deliberately styled after Wikipedia's, which is exactly
		why this has to be on the page rather than only in the README: the closer
		the resemblance, the more readily someone reads the game as an official
		Wikimedia project. It sits outside <main> so it is page furniture rather
		than part of any screen.
	-->
	<footer class="text-muted mt-8 w-full max-w-lg text-center text-xs leading-relaxed text-balance">
		Not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a registered trademark
		of the Wikimedia Foundation.
	</footer>
</div>
