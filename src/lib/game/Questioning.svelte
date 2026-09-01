<script lang="ts">
	import { t } from '$lib/i18n';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';
	import PlayerList from './PlayerList.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const text = t();
	const room = $derived(connection.state);
</script>

{#if room?.article}
	<ArticleHeading article={room.article} />
{/if}

{#if connection.isGuesser}
	<p class="mt-4 font-semibold">{text.questioning.guesserLead}</p>
	<p class="text-muted mt-1 text-sm">{text.questioning.guesserBody}</p>
	<div class="mt-4">
		<PlayerList {connection} pickable />
	</div>
{:else}
	<p class="mt-4 font-semibold">{text.questioning.answerLead}</p>
	<p class="text-muted mt-1 text-sm">
		{connection.own.isReader ? text.questioning.readerBody : text.questioning.blufferBody}
	</p>
	<p class="text-muted mt-4 text-sm">
		{text.questioning.waitingFor(
			room?.players.find((player) => player.id === room?.guesserId)?.name ?? '…'
		)}
	</p>
{/if}
