<script lang="ts">
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import { t } from '$lib/i18n';
	import ArticleHeading from './ArticleHeading.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const text = t();
	const room = $derived(connection.state);
	const reading = $derived(connection.own.reading);
	const done = $derived(connection.own.doneReading);
	const stillReading = $derived(
		(room?.players ?? []).filter(
			(player) => player.id !== room?.guesserId && !player.doneReading && player.connected
		).length
	);

	// The server sends how long was left when it sent the state; run it on from
	// there locally rather than trusting the two clocks to agree.
	let now = $state(Date.now());
	$effect(() => {
		const tick = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(tick);
	});

	const msLeft = $derived(Math.max(0, (room?.readingMsLeft ?? 0) - (now - connection.receivedAt)));
	const secondsLeft = $derived(Math.ceil(msLeft / 1000));
	const fraction = $derived(
		room?.settings.readingSeconds ? msLeft / (room.settings.readingSeconds * 1000) : 0
	);
</script>

<!-- On a phone the extract is taller than the screen, so an unpinned countdown
     is gone by the time it matters. The negative margins let the backing span
     the card's full width; they mirror its p-6 sm:p-8. -->
<div class="bg-panel sticky top-0 z-10 -mx-6 mb-4 px-6 pt-2 pb-3 sm:-mx-8 sm:px-8">
	<div class="flex items-baseline justify-between">
		<span class="text-muted text-sm font-semibold tracking-widest uppercase"
			>{text.reading.label}</span
		>
		<span class="text-2xl font-black">{text.reading.secondsLeft(secondsLeft)}</span>
	</div>
	<div class="bg-line mt-2 h-1.5 overflow-hidden rounded-full">
		<div
			class="bg-accent h-full rounded-full transition-[width] duration-200 ease-linear"
			style="width: {fraction * 100}%"
		></div>
	</div>
</div>

{#if reading}
	<p class="font-semibold">{text.reading.yoursLead}</p>
	<p class="text-muted mt-1 mb-4 text-sm">{text.reading.yoursBody}</p>

	<ArticleHeading article={reading} href={reading.url} />
	<p class="mt-4 leading-relaxed">{reading.extract}</p>
	<!-- Out to Wikipedia, not to a route in this app. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		href={reading.url}
		target="_blank"
		rel="noreferrer"
		class="text-accent mt-4 inline-block text-sm font-semibold underline underline-offset-4"
	>
		{text.reading.openFull}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	<div class="mt-6">
		{#if done}
			<p class="text-muted text-center text-sm">{text.reading.waitingOthers(stillReading)}</p>
		{:else}
			<Button class="w-full" onclick={() => connection.send({ type: 'done-reading' })}>
				{text.reading.doneReading}
			</Button>
		{/if}
	</div>
{:else}
	<p class="font-semibold">{text.reading.guesserLead}</p>
	<p class="text-muted mt-1">{text.reading.guesserBody}</p>
{/if}
