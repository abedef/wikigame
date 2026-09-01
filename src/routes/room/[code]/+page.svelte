<script lang="ts">
	import Card from '$lib/Card.svelte';
	import Table from '$lib/game/Table.svelte';
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
	const copyable = $derived(typeof navigator !== 'undefined' && !!navigator.clipboard);

	let copied = $state(false);
	async function copyInvite() {
		await navigator.clipboard.writeText(location.href);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
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
	<Table
		{connection}
		eyebrow={room.stage === 'lobby'
			? text.room.label
			: room.stage === 'finished'
				? text.room.withCode(room.code)
				: text.room.roundOf(room.round, room.settings.rounds)}
	>
		{#snippet actions()}
			{#if room.stage === 'lobby' && copyable}
				<button
					type="button"
					onclick={copyInvite}
					class="text-accent shrink-0 cursor-pointer text-sm underline underline-offset-4"
				>
					{copied ? text.room.inviteCopied : text.room.copyInvite}
				</button>
			{/if}
		{/snippet}

		{#snippet beneathHeading()}
			{#if room.stage === 'lobby'}
				<!-- Read out loud to get everybody else in, so it is the biggest thing
				     on the screen while the room is filling up. -->
				<p class="text-muted mt-1 text-4xl font-black tracking-[0.2em]">{room.code}</p>
			{/if}
		{/snippet}
	</Table>
{/if}
