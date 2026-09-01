<script lang="ts">
	import Card from '$lib/Card.svelte';
	import Finished from '$lib/game/Finished.svelte';
	import Lobby from '$lib/game/Lobby.svelte';
	import Picking from '$lib/game/Picking.svelte';
	import PlayerList from '$lib/game/PlayerList.svelte';
	import Questioning from '$lib/game/Questioning.svelte';
	import Reading from '$lib/game/Reading.svelte';
	import Reveal from '$lib/game/Reveal.svelte';
	import { GameConnection } from '$lib/game-connection.svelte';
	import { resolve } from '$app/paths';
	import { t } from '$lib/i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const text = t();

	let connection = $state<GameConnection | null>(null);

	$effect(() => {
		const live = new GameConnection(data.code, data.session.token, data.session.name);
		connection = live;
		live.connect();
		return () => live.close();
	});

	const room = $derived(connection?.state ?? null);
	const away = $derived(room?.players.filter((player) => !player.connected).length ?? 0);
	const copyable = $derived(typeof navigator !== 'undefined' && !!navigator.clipboard);

	let copied = $state(false);
	async function copyInvite() {
		await navigator.clipboard.writeText(location.href);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	const headings: Record<string, string> = text.room.stage;
</script>

<svelte:head>
	<title>{text.meta.roomTitle(data.code)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if connection?.error && connection.status === 'closed'}
	<Card>
		<h1 class="wiki-heading text-2xl">{text.room.cantJoin(data.code)}</h1>
		<p class="text-muted mt-2">{text.errors[connection.error.code] ?? connection.error.message}</p>
		<a
			class="text-accent mt-4 inline-block font-semibold underline underline-offset-4"
			href={resolve('/')}
		>
			{text.room.back}
		</a>
	</Card>
{:else if !room || !connection}
	<Card>
		<p class="text-muted text-center">{text.room.connectingTo(data.code)}</p>
	</Card>
{:else}
	<Card>
		<header>
			<!-- The line above the title and the rule under it are the shape of a
			     Wikipedia page; the invite sits where an [edit] link would. -->
			<div class="flex items-baseline justify-between gap-4">
				<p class="text-muted text-xs font-semibold tracking-widest uppercase">
					{#if room.stage === 'lobby'}
						{text.room.label}
					{:else if room.stage === 'finished'}
						{text.room.withCode(room.code)}
					{:else}
						{text.room.roundOf(room.round, room.settings.rounds)}
					{/if}
				</p>
				{#if room.stage === 'lobby' && copyable}
					<button
						type="button"
						onclick={copyInvite}
						class="text-accent shrink-0 cursor-pointer text-sm underline underline-offset-4"
					>
						{copied ? text.room.inviteCopied : text.room.copyInvite}
					</button>
				{/if}
			</div>
			<h1 class="wiki-heading mt-1 text-3xl">{headings[room.stage] ?? room.stage}</h1>
		</header>

		{#if room.stage === 'lobby'}
			<p class="text-muted mt-1 text-4xl font-black tracking-[0.2em]">{room.code}</p>
		{/if}

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

		{#if connection.isHost && (room.stage === 'picking' || room.stage === 'reading' || room.stage === 'questioning')}
			<button
				type="button"
				class="text-muted hover:text-ink mt-6 cursor-pointer text-sm underline underline-offset-4"
				onclick={() => connection?.send({ type: 'abort-round' })}
			>
				{text.room.abandon}
			</button>
		{/if}
	</Card>
{/if}
