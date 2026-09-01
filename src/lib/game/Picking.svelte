<script lang="ts">
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const room = $derived(connection.state);
	const own = $derived(connection.own);
	const settled = $derived(
		(room?.players ?? []).filter((player) => player.id !== room?.guesserId && player.lockedIn)
			.length
	);
	const total = $derived(
		(room?.players ?? []).filter((player) => player.id !== room?.guesserId).length
	);
</script>

{#if connection.isGuesser}
	<p class="font-semibold">You are the guesser this round.</p>
	<p class="text-muted mt-2">
		Everyone else is drawing a random article. One of theirs will be chosen, and only that person
		gets to read it — your job is to work out who.
	</p>
	<p class="text-muted mt-4 text-sm">{settled} of {total} have settled on an article.</p>
{:else if own.lockedIn}
	<p class="font-semibold">Locked in.</p>
	<p class="text-muted mt-2">
		Waiting for the others. {settled} of {total} have chosen.
	</p>
{:else if own.candidate}
	<p class="text-muted text-sm">
		If this one is drawn, you will be the only person who reads it — and you will be trying to
		convince the guesser that you did. Redraw until you get something you could talk about.
	</p>
	<div class="mt-4">
		<ArticleHeading article={own.candidate} />
	</div>
	<div class="mt-4 grid gap-2 sm:grid-cols-2">
		<Button
			variant="secondary"
			disabled={own.rerollsLeft === 0}
			onclick={() => connection.send({ type: 'reroll' })}
		>
			{own.rerollsLeft > 0 ? `Redraw (${own.rerollsLeft} left)` : 'No redraws left'}
		</Button>
		<Button onclick={() => connection.send({ type: 'lock-in' })}>Lock this in</Button>
	</div>
{:else}
	<p class="text-muted">Drawing an article for you…</p>
{/if}
