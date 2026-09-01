<script lang="ts">
	import { t } from '$lib/i18n';
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const text = t();
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
	<p class="font-semibold">{text.picking.guesserLead}</p>
	<p class="text-muted mt-2">{text.picking.guesserBody}</p>
	<p class="text-muted mt-4 text-sm">{text.picking.settled(settled, total)}</p>
{:else if own.lockedIn}
	<p class="font-semibold">{text.picking.lockedIn}</p>
	<p class="text-muted mt-2">{text.picking.waitingOthers(settled, total)}</p>
{:else if own.candidate}
	<p class="text-muted text-sm">{text.picking.hint}</p>
	<div class="mt-4">
		<ArticleHeading article={own.candidate} />
	</div>
	<div class="mt-4 grid gap-2 sm:grid-cols-2">
		<Button
			variant="secondary"
			disabled={own.rerollsLeft === 0}
			onclick={() => connection.send({ type: 'reroll' })}
		>
			{own.rerollsLeft > 0 ? text.picking.redraw(own.rerollsLeft) : text.picking.noRedraws}
		</Button>
		<Button onclick={() => connection.send({ type: 'lock-in' })}>{text.picking.lockThisIn}</Button>
	</div>
{:else}
	<p class="text-muted">{text.picking.drawing}</p>
{/if}
