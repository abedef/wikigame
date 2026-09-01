<script lang="ts">
	import type { GameConnection } from '$lib/game-connection.svelte';
	import { t } from '$lib/i18n';

	let { connection }: { connection: GameConnection } = $props();

	const text = t();
	const room = $derived(connection.state);

	let dialog = $state<HTMLDialogElement | null>(null);

	/**
	 * The same guidance the screen is already showing, repeated here for someone
	 * who scrolled past it or lost the thread halfway through a round. Derived
	 * from the stage and this player's role rather than stored, so it cannot
	 * drift out of step with what is actually happening.
	 */
	const now = $derived.by(() => {
		const guesser = connection.isGuesser;
		switch (room?.stage) {
			case 'lobby':
				return text.lobby.waitingForReady;
			case 'picking':
				return guesser ? text.picking.guesserBody : text.picking.hint;
			case 'reading':
				return guesser ? text.reading.guesserBody : text.reading.yoursBody;
			case 'questioning':
				if (guesser) return text.questioning.guesserBody;
				return connection.own.isReader ? text.questioning.readerBody : text.questioning.blufferBody;
			default:
				return null;
		}
	});
</script>

<!-- Fixed rather than placed in the card: it has to be reachable without
     scrolling, and during the reading the card is taller than the screen. -->
<button
	type="button"
	aria-label={text.room.helpTitle}
	onclick={() => dialog?.showModal()}
	class="border-line bg-panel text-muted hover:text-ink hover:border-accent fixed top-3 right-3 z-20
		h-9 w-9 cursor-pointer rounded-full border font-serif text-lg leading-none shadow-sm transition"
>
	?
</button>

<dialog
	bind:this={dialog}
	closedby="any"
	class="bg-panel text-ink border-line m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border p-6
		backdrop:bg-black/40 sm:p-8"
>
	<h2 class="wiki-heading text-2xl">{text.room.helpTitle}</h2>

	{#if now}
		<h3 class="text-muted mt-5 text-sm font-semibold tracking-widest uppercase">
			{text.room.helpNow}
		</h3>
		<p class="mt-1">{now}</p>
	{/if}

	<h3 class="text-muted mt-6 text-sm font-semibold tracking-widest uppercase">
		{text.room.helpRules}
	</h3>
	<ol class="mt-2 grid gap-2">
		{#each text.howItWorks.steps as step, index (step.title)}
			<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
				<span class="text-muted font-serif">{index + 1}.</span>
				<span class="min-w-0 text-sm">
					<span class="font-semibold">{step.title}</span>
					<span class="text-muted"> — {step.body}</span>
				</span>
			</li>
		{/each}
	</ol>

	<h3 class="text-muted mt-6 text-sm font-semibold tracking-widest uppercase">
		{text.room.helpScoring}
	</h3>
	<ul class="text-muted mt-2 grid gap-1 text-sm">
		{#each text.scoring as line (line)}
			<li>{line}</li>
		{/each}
	</ul>

	<form method="dialog" class="mt-6">
		<button
			type="submit"
			class="bg-accent text-accent-ink w-full cursor-pointer rounded-xl border border-transparent px-4 py-2 font-semibold"
		>
			{text.room.helpClose}
		</button>
	</form>
</dialog>
