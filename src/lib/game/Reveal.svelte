<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const text = t();
	const room = $derived(connection.state);
	const named = $derived(room?.players.find((player) => player.id === room?.guessId) ?? null);
	const reader = $derived(room?.players.find((player) => player.id === room?.readerId) ?? null);
	const guesser = $derived(room?.players.find((player) => player.id === room?.guesserId) ?? null);
	const correct = $derived(room?.guessId != null && room.guessId === room.readerId);
	const article = $derived(room?.revealedArticle);
	const lastRound = $derived((room?.round ?? 0) >= (room?.settings.rounds ?? 0));
</script>

<p class="text-lg font-bold">
	{correct
		? text.reveal.found(guesser?.name ?? '')
		: text.reveal.missed(named?.name ?? '', reader?.name ?? '')}
</p>
<p class="text-muted mt-1 text-sm">
	{correct ? text.reveal.foundBody(reader?.name ?? '') : text.reveal.missedBody(named?.name ?? '')}
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
			{lastRound ? text.reveal.seeFinalScores : text.reveal.nextRound((room?.round ?? 0) + 1)}
		</Button>
	</div>
	<p class="text-muted mt-2 text-center text-sm">{text.reveal.takesChair(named?.name ?? '')}</p>
{:else}
	<p class="text-muted mt-6 text-center text-sm">{text.reveal.waitingForHost(named?.name ?? '')}</p>
{/if}
