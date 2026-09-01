<script lang="ts">
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const room = $derived(connection.state);
	const named = $derived(room?.players.find((player) => player.id === room?.guessId) ?? null);
	const reader = $derived(room?.players.find((player) => player.id === room?.readerId) ?? null);
	const guesser = $derived(room?.players.find((player) => player.id === room?.guesserId) ?? null);
	const correct = $derived(room?.guessId != null && room.guessId === room.readerId);
	const article = $derived(room?.revealedArticle);
	const lastRound = $derived((room?.round ?? 0) >= (room?.settings.rounds ?? 0));
</script>

<p class="text-lg font-bold">
	{#if correct}
		{guesser?.name} found the reader.
	{:else}
		{named?.name} was named — but {reader?.name} was the reader.
	{/if}
</p>
<p class="text-muted mt-1 text-sm">
	{#if correct}
		{reader?.name} got the article across, and they both score for it.
	{:else}
		{named?.name} bluffed their way past the real thing.
	{/if}
</p>

{#if article}
	<div class="mt-4">
		<ArticleHeading {article} href={article.url} />
	</div>
	<p class="mt-4 leading-relaxed">{article.extract}</p>
{/if}

{#if connection.isHost}
	<div class="mt-6">
		<Button class="w-full" onclick={() => connection.send({ type: 'next-round' })}>
			{lastRound ? 'See the final scores' : `Start round ${(room?.round ?? 0) + 1}`}
		</Button>
	</div>
	<p class="text-muted mt-2 text-center text-sm">
		{named?.name} takes the chair next.
	</p>
{:else}
	<p class="text-muted mt-6 text-center text-sm">
		{named?.name} is the next guesser. Waiting for the host.
	</p>
{/if}
