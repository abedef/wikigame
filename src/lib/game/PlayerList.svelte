<script lang="ts">
	import type { GameConnection } from '$lib/game-connection.svelte';

	let { connection, pickable = false }: { connection: GameConnection; pickable?: boolean } =
		$props();

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
					{#if player.id === connection.you}
						<span class="text-muted text-sm">(you)</span>
					{/if}
					{#if isGuesser}
						<span class="bg-accent text-accent-ink rounded-full px-2 py-0.5 text-xs font-bold">
							Guesser
						</span>
					{:else if isReader}
						<span
							class="border-accent text-accent rounded-full border px-2 py-0.5 text-xs font-bold"
						>
							Reader
						</span>
					{/if}
					{#if player.isHost}
						<span
							class="border-line text-muted rounded-full border px-2 py-0.5 text-xs font-semibold"
						>
							Host
						</span>
					{/if}
				</span>

				<span class="flex shrink-0 items-center gap-3">
					{#if award}
						<span class="text-accent text-sm font-bold">+{award}</span>
					{/if}
					{#if !player.connected}
						<span class="text-muted text-sm">away</span>
					{:else if room?.stage === 'lobby'}
						<span class="text-sm {player.ready ? 'text-accent font-semibold' : 'text-muted'}">
							{player.ready ? 'Ready' : 'Not ready'}
						</span>
					{:else if room?.stage === 'picking' && !isGuesser}
						<span class="text-sm {player.lockedIn ? 'text-accent font-semibold' : 'text-muted'}">
							{player.lockedIn ? 'Locked in' : 'Choosing'}
						</span>
					{:else}
						<span class="text-sm font-bold">{player.score}</span>
					{/if}
				</span>
			</svelte:element>
		</li>
	{/each}
</ul>
