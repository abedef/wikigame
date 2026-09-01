<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/Button.svelte';
	import Card from '$lib/Card.svelte';
	import Wordmark from '$lib/Wordmark.svelte';
	import { t } from '$lib/i18n';
	import { MAX_NAME_LENGTH } from '$lib/protocol';
	import { ROOM_CODE_LENGTH } from '$lib/room-code';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const text = t();

	let editingName = $state(false);
	const name = $derived(form?.name ?? data.session.name);
</script>

<svelte:head>
	<title>{text.brand}</title>
	<meta name="description" content={text.meta.description} />
</svelte:head>

<Card>
	<div class="text-center">
		<h1><Wordmark /></h1>
		<p class="text-muted mt-3 font-serif">{text.meta.tagline}</p>
	</div>

	<p class="border-line-soft mt-6 border-t pt-6 leading-relaxed">
		{text.landing.pitchBefore}
		<!-- The marker has to stay welded to the word it annotates; on a narrow
		     screen it otherwise wraps onto a line of its own and stops reading as
		     a footnote at all. -->
		<span class="whitespace-nowrap"
			>{text.landing.pitchLastWord}<sup class="text-accent ml-0.5 text-[0.7em]">{text.brand}</sup
			></span
		>
	</p>

	<div class="border-line-soft mt-6 border-t pt-6">
		{#if editingName}
			<form
				method="POST"
				action="?/name"
				class="flex flex-wrap items-center gap-2"
				use:enhance={() =>
					({ update }) => {
						editingName = false;
						return update({ reset: false });
					}}
			>
				<label class="sr-only" for="name">{text.landing.yourName}</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					id="name"
					name="name"
					value={name}
					maxlength={MAX_NAME_LENGTH}
					required
					autofocus
					class="border-line bg-surface focus-visible:outline-accent min-w-0 flex-1 rounded-xl border
						px-3 py-2 focus-visible:outline-2"
				/>
				<Button type="submit">{text.landing.save}</Button>
			</form>
		{:else}
			<p class="text-muted">
				{text.landing.youAre} <span class="text-ink font-semibold">{name}</span>.
				<button
					type="button"
					class="hover:text-ink cursor-pointer underline underline-offset-4"
					onclick={() => (editingName = true)}>{text.landing.change}</button
				>
			</p>
		{/if}
		{#if form?.nameError}
			<p class="text-accent mt-2 text-sm">{form.nameError}</p>
		{/if}
	</div>

	<div class="mt-6 grid gap-4">
		<form method="POST" action="?/host" use:enhance>
			<Button type="submit" class="w-full">{text.landing.host}</Button>
		</form>
		{#if form?.hostError}
			<p class="text-accent text-sm">{form.hostError}</p>
		{/if}

		<div class="text-muted flex items-center gap-3 text-sm">
			<span class="bg-line h-px flex-1"></span>{text.landing.orJoin}<span
				class="bg-line h-px flex-1"
			></span>
		</div>

		<form method="POST" action="?/join" class="flex gap-2" use:enhance>
			<label class="sr-only" for="code">{text.landing.roomCode}</label>
			<input
				id="code"
				name="code"
				placeholder={text.landing.roomCode}
				maxlength={ROOM_CODE_LENGTH}
				size={ROOM_CODE_LENGTH}
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				required
				class="border-line bg-surface focus-visible:outline-accent min-w-0 flex-1 rounded-xl border
					px-3 py-2 text-center text-lg font-semibold tracking-[0.4em] uppercase
					focus-visible:outline-2"
			/>
			<Button type="submit" variant="secondary">{text.landing.join}</Button>
		</form>
		{#if form?.codeError}
			<p class="text-accent text-sm">{form.codeError}</p>
		{/if}
	</div>

	<!--
		Below the controls on purpose. Most arrivals come from an invite link and
		want to be in the room, not read about it; this is here for the host and
		the curious. minmax(0,1fr) because a grid column is min-width:auto by
		default and would refuse to shrink on a narrow screen.
	-->
	<section class="border-line-soft mt-8 border-t pt-6">
		<h2 class="wiki-heading text-xl">{text.howItWorks.heading}</h2>
		<ol class="mt-4 grid gap-4">
			{#each text.howItWorks.steps as step, index (step.title)}
				<li class="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
					<span class="text-muted font-serif text-xl leading-tight">{index + 1}.</span>
					<span class="min-w-0">
						<span class="font-semibold">{step.title}</span>
						<span class="text-muted mt-0.5 block text-sm">{step.body}</span>
					</span>
				</li>
			{/each}
		</ol>
		<p class="text-muted mt-5 text-sm">{text.howItWorks.kicker}</p>
	</section>
</Card>
