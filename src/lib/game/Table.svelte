<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/Card.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import { t } from '$lib/i18n';
	import Finished from './Finished.svelte';
	import Help from './Help.svelte';
	import Lobby from './Lobby.svelte';
	import Picking from './Picking.svelte';
	import PlayerList from './PlayerList.svelte';
	import Questioning from './Questioning.svelte';
	import Reading from './Reading.svelte';
	import Reveal from './Reveal.svelte';

	/**
	 * One round of the game, wherever it is being played.
	 *
	 * The website and the Discord activity differ in how a player arrives — a
	 * code and a cookie on one, an activity instance and a Discord account on the
	 * other — and in nothing after that. Both hand the same live connection to
	 * this component, so a change to a stage, the player list or the recovery
	 * controls reaches both by construction rather than by anybody remembering.
	 *
	 * What genuinely differs goes in through `eyebrow` and `actions`.
	 */
	let {
		connection,
		eyebrow,
		actions,
		beneathHeading
	}: {
		connection: GameConnection;
		/** The small line above the stage heading. */
		eyebrow: string;
		/** Anything belonging beside it, like the website's invite link. */
		actions?: Snippet;
		/** Anything belonging under it, like the website's room code. */
		beneathHeading?: Snippet;
	} = $props();

	const text = t();
	const room = $derived(connection.state);
	const away = $derived(room?.players.filter((player) => !player.connected).length ?? 0);

	const headings: Record<string, string> = text.room.stage;
</script>

{#if room}
	<Help {connection} />

	<Card>
		<header>
			<!-- The line above the title and the rule under it are the shape of a
			     Wikipedia page; anything else sits where an [edit] link would. -->
			<div class="flex items-baseline justify-between gap-4">
				<p class="text-muted text-xs font-semibold tracking-widest uppercase">{eyebrow}</p>
				{@render actions?.()}
			</div>
			<h1 class="wiki-heading mt-1 text-3xl">{headings[room.stage] ?? room.stage}</h1>
		</header>

		{@render beneathHeading?.()}

		{#if connection.status !== 'open'}
			<p class="border-line text-muted mt-4 rounded-xl border border-dashed px-3 py-2 text-sm">
				{connection.status === 'reconnecting' ? text.room.reconnecting : text.room.connecting}
			</p>
		{/if}

		{#if connection.error}
			<p class="text-accent mt-4 text-sm">
				{text.errors[connection.error.code] ?? connection.error.message}
			</p>
		{/if}

		<section class="mt-6">
			{#if room.stage === 'lobby'}
				<Lobby {connection} />
			{:else if room.stage === 'picking'}
				<Picking {connection} />
			{:else if room.stage === 'reading'}
				<Reading {connection} />
			{:else if room.stage === 'questioning'}
				<Questioning {connection} />
			{:else if room.stage === 'reveal'}
				<Reveal {connection} />
			{:else if room.stage === 'finished'}
				<Finished {connection} />
			{/if}
		</section>

		{#if room.stage !== 'finished' && !(room.stage === 'questioning' && connection.isGuesser)}
			<section class="border-line mt-6 border-t pt-6">
				<h2 class="text-muted mb-3 text-sm font-semibold tracking-widest uppercase">
					{text.players.heading(room.players.length)}{away ? ` · ${text.players.away(away)}` : ''}
				</h2>
				<PlayerList {connection} />
			</section>
		{/if}

		<!--
			The only way out of a round that has stopped moving. It matters more in
			Discord than on the website, not less: people leave a voice call
			mid-round as a matter of course.
		-->
		{#if connection.isHost && (room.stage === 'picking' || room.stage === 'reading' || room.stage === 'questioning')}
			<button
				type="button"
				class="text-muted hover:text-ink mt-6 cursor-pointer text-sm underline underline-offset-4"
				onclick={() => connection.send({ type: 'abort-round' })}
			>
				{text.room.abandon}
			</button>
		{/if}
	</Card>
{/if}
