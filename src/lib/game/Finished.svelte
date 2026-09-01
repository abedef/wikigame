<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const text = t();
	const standings = $derived(
		[...(connection.state?.players ?? [])].sort((a, b) => b.score - a.score)
	);
	const best = $derived(standings[0]?.score ?? 0);
	const winners = $derived(standings.filter((player) => player.score === best));
</script>

<h2 class="wiki-heading text-2xl">
	{winners.length === 1
		? text.finished.wins(winners[0].name)
		: text.finished.tie(winners.map((player) => player.name))}
</h2>

<ol class="mt-6 grid gap-2">
	{#each standings as player, position (player.id)}
		<!-- min-w-0 so a long name truncates rather than widening the row; see PlayerList. -->
		<li
			class="border-line flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-2
				{player.score === best ? 'border-accent' : ''}"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span class="text-muted w-5 text-sm font-bold tabular-nums">{position + 1}</span>
				<span class="truncate font-semibold">{player.name}</span>
				{#if player.id === connection.you}
					<span class="text-muted text-sm">{text.players.you}</span>
				{/if}
			</span>
			<span class="text-lg font-black">{player.score}</span>
		</li>
	{/each}
</ol>

{#if connection.isHost}
	<div class="mt-6">
		<Button class="w-full" onclick={() => connection.send({ type: 'play-again' })}
			>{text.finished.playAgain}</Button
		>
	</div>
{:else}
	<p class="text-muted mt-6 text-center text-sm">Waiting for the host to start another game.</p>
{/if}
