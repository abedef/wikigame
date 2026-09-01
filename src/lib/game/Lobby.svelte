<script lang="ts">
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import { MAX_NAME_LENGTH, MIN_PLAYERS, SETTING_LIMITS, type RoomSettings } from '$lib/protocol';

	let { connection }: { connection: GameConnection } = $props();

	const room = $derived(connection.state);
	const me = $derived(connection.me);
	const present = $derived((room?.players ?? []).filter((player) => player.connected));
	const canStart = $derived(
		present.length >= MIN_PLAYERS && present.every((player) => player.ready)
	);

	let renaming = $state(false);
	let draftName = $state('');

	async function rename(event: SubmitEvent) {
		event.preventDefault();
		const name = draftName.trim();
		renaming = false;
		if (!name) return;

		// The room needs to know now; the cookie needs to know for next time.
		connection.send({ type: 'set-name', name });
		await fetch('/api/name', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name })
		}).catch(() => {});
	}

	function setSetting(key: keyof RoomSettings, value: number) {
		connection.send({ type: 'set-settings', settings: { [key]: value } });
	}

	const controls: { key: keyof RoomSettings; label: string; hint: string }[] = [
		{ key: 'rounds', label: 'Rounds', hint: 'How many times the chair changes hands.' },
		{ key: 'rerolls', label: 'Redraws', hint: 'Redraws each player gets per round.' },
		{ key: 'readingSeconds', label: 'Reading time', hint: 'Seconds the reader gets alone with it.' }
	];
</script>

{#if renaming}
	<form class="mb-4 flex gap-2" onsubmit={rename}>
		<label class="sr-only" for="rename">Your name</label>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="rename"
			bind:value={draftName}
			maxlength={MAX_NAME_LENGTH}
			autofocus
			class="border-line bg-surface focus-visible:outline-accent min-w-0 flex-1 rounded-xl border
				px-3 py-2 focus-visible:outline-2"
		/>
		<Button type="submit" variant="secondary">Save</Button>
	</form>
{:else}
	<button
		type="button"
		class="text-muted hover:text-ink mb-4 cursor-pointer text-sm underline underline-offset-4"
		onclick={() => {
			draftName = me?.name ?? '';
			renaming = true;
		}}
	>
		Change your name
	</button>
{/if}

{#if connection.isHost}
	<div class="border-line mb-4 grid gap-3 rounded-xl border p-4">
		{#each controls as control (control.key)}
			<label class="flex items-center justify-between gap-3">
				<span>
					<span class="font-semibold">{control.label}</span>
					<span class="text-muted block text-xs">{control.hint}</span>
				</span>
				<input
					type="number"
					min={SETTING_LIMITS[control.key].min}
					max={SETTING_LIMITS[control.key].max}
					value={room?.settings[control.key]}
					onchange={(event) => setSetting(control.key, Number(event.currentTarget.value))}
					class="border-line bg-surface focus-visible:outline-accent w-20 shrink-0 rounded-xl border
						px-3 py-2 text-center focus-visible:outline-2"
				/>
			</label>
		{/each}
	</div>
{:else}
	<p class="text-muted mb-4 text-sm">
		{room?.settings.rounds} rounds · {room?.settings.rerolls} redraws · {room?.settings
			.readingSeconds}s to read
	</p>
{/if}

<div class="grid gap-3">
	<Button
		variant={me?.ready ? 'secondary' : 'primary'}
		onclick={() => connection.send({ type: 'set-ready', ready: !me?.ready })}
	>
		{me?.ready ? "I'm not ready" : "I'm ready"}
	</Button>

	{#if connection.isHost}
		<Button disabled={!canStart} onclick={() => connection.send({ type: 'start' })}>
			Start the game
		</Button>
		{#if !canStart}
			<p class="text-muted text-center text-sm">
				{present.length < MIN_PLAYERS
					? `Waiting for ${MIN_PLAYERS - present.length} more player${MIN_PLAYERS - present.length === 1 ? '' : 's'}.`
					: 'Waiting for everyone to be ready.'}
			</p>
		{/if}
	{:else}
		<p class="text-muted text-center text-sm">
			{canStart ? 'Waiting for the host to start.' : 'Waiting for everyone to be ready.'}
		</p>
	{/if}
</div>
