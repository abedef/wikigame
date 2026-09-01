<script lang="ts">
	import '../app.css';
	import { provideMessages } from '$lib/i18n';

	let { children, data } = $props();

	// Every component below reads its text from here, and it has to be provided
	// before they initialise. Reading the initial value is what is wanted: the
	// locale is settled server-side per document, and changing it reloads the
	// page rather than swapping strings under a live component tree.
	// svelte-ignore state_referenced_locally
	const t = provideMessages(data.locale);
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
		{t.meta.disclaimer}
	</footer>
</div>
