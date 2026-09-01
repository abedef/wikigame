<script lang="ts">
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';
	import PlayerList from './PlayerList.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const room = $derived(connection.state);
</script>

{#if room?.article}
	<ArticleHeading article={room.article} />
{/if}

{#if connection.isGuesser}
	<p class="mt-4 font-semibold">Question the table, then name the reader.</p>
	<p class="text-muted mt-1 text-sm">
		The reader is on your side — they score when you find them. Everyone else is trying to sound
		exactly like them. Take as long as you like; choose when you are ready.
	</p>
	<div class="mt-4">
		<PlayerList {connection} pickable />
	</div>
{:else}
	<p class="mt-4 font-semibold">Answer the questions.</p>
	<p class="text-muted mt-1 text-sm">
		{#if connection.own.isReader}
			Convince them it was you.
		{:else}
			You never saw it. Convince them you did anyway — being named is worth more to you than being
			believed by anyone else.
		{/if}
	</p>
	<p class="text-muted mt-4 text-sm">
		Waiting for {room?.players.find((player) => player.id === room?.guesserId)?.name ??
			'the guesser'}
		to decide.
	</p>
{/if}
