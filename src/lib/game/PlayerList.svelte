<script lang="ts">
	import { t } from '$lib/i18n';
	import type { GameConnection } from '$lib/game-connection.svelte';

	let { connection, pickable = false }: { connection: GameConnection; pickable?: boolean } =
		$props();

	const text = t();
	const room = $derived(connection.state);
</script>

<ul class="grid gap-2">
	{#each room?.players ?? [] as player (player.id)}
		{@const isGuesser = player.id === room?.guesserId}
		{@const isReader = player.id === room?.readerId}
		{@const award = room?.awards?.[player.id]}
		<!-- min-w-0: a grid item will not shrink below its content otherwise,
		     so a long name would widen the row instead of being truncated. -->
		<li class="min-w-0">
			<svelte:element
				this={pickable && !isGuesser ? 'button' : 'div'}
				role={pickable && !isGuesser ? 'button' : undefined}
				onclick={pickable && !isGuesser
					? () => connection.send({ type: 'guess', playerId: player.id })
					: undefined}
				class="border-line flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2
					text-left {player.connected ? '' : 'opacity-45'}
					{pickable && !isGuesser ? 'hover:border-accent cursor-pointer transition' : ''}
					{isReader ? 'border-accent' : ''}"
			>
				<span class="flex min-w-0 items-center gap-2">
					<span class="truncate font-semibold">{player.name}</span>
					<!-- Roles are set like the template the game is named after rather than as
					     filled badges: narrower, so the name keeps the room, and of a piece
					     with the [copy invite link] treatment elsewhere. shrink-0 keeps them
					     whole so it is the name that truncates. -->
					{#if player.id === connection.you}
						<span class="text-muted shrink-0 text-sm">{text.players.you}</span>
					{/if}
					{#if isGuesser}
						<span class="text-accent shrink-0 text-xs font-semibold">{text.players.guesser}</span>
					{:else if isReader}
						<span class="text-accent shrink-0 text-xs font-semibold">{text.players.reader}</span>
					{/if}
					{#if player.isHost}
						<span class="text-muted shrink-0 text-xs">{text.players.host}</span>
					{/if}
				</span>

				<span class="flex shrink-0 items-center gap-3">
					{#if award}
						<span class="text-accent text-sm font-bold">+{award}</span>
					{/if}
					{#if !player.connected}
						<span class="text-muted text-sm">{text.players.disconnected}</span>
					{:else if room?.stage === 'lobby'}
						<span class="text-sm {player.ready ? 'text-accent font-semibold' : 'text-muted'}">
							{player.ready ? text.players.ready : text.players.notReady}
						</span>
					{:else if room?.stage === 'reading' && !isGuesser}
						<span class="text-sm {player.doneReading ? 'text-accent font-semibold' : 'text-muted'}">
							{player.doneReading ? text.players.doneReading : text.players.reading}
						</span>
					{:else if room?.stage === 'picking' && !isGuesser}
						<span class="text-sm {player.lockedIn ? 'text-accent font-semibold' : 'text-muted'}">
							{player.lockedIn ? text.players.lockedIn : text.players.choosing}
						</span>
					{:else}
						<span class="text-sm font-bold">{player.score}</span>
					{/if}
				</span>
			</svelte:element>
		</li>
	{/each}
</ul>
