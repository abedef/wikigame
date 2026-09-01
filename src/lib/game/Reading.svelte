<script lang="ts">
	import Button from '$lib/Button.svelte';
	import type { GameConnection } from '$lib/game-connection.svelte';
	import ArticleHeading from './ArticleHeading.svelte';

	let { connection }: { connection: GameConnection } = $props();

	const room = $derived(connection.state);
	const reading = $derived(connection.own.reading);

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

<div class="mb-4">
	<div class="flex items-baseline justify-between">
		<span class="text-muted text-sm font-semibold tracking-widest uppercase">Reading</span>
		<span class="text-2xl font-black">{secondsLeft}s</span>
	</div>
	<div class="bg-line mt-2 h-1.5 overflow-hidden rounded-full">
		<div
			class="bg-accent h-full rounded-full transition-[width] duration-200 ease-linear"
			style="width: {fraction * 100}%"
		></div>
	</div>
</div>

{#if reading}
	<p class="text-accent font-semibold">This one is yours. You are the reader.</p>
	<p class="text-muted mt-1 mb-4 text-sm">
		You want to be found: the guesser scores with you. Take in enough to prove you were really here
		— but remember everyone else can hear your answers and will copy them.
	</p>
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
		Open the full article
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
	<div class="mt-6">
		<Button class="w-full" onclick={() => connection.send({ type: 'done-reading' })}>
			I've read enough — start the questions
		</Button>
	</div>
{:else if room?.article}
	<ArticleHeading article={room.article} />
	<p class="text-muted mt-4">
		{#if connection.isGuesser}
			One of the others is reading this right now. Everyone will claim they did.
		{:else}
			Someone else drew this and is reading it now. You will have to pretend it was you, so think
			about anything you already know on the subject.
		{/if}
	</p>
{/if}
