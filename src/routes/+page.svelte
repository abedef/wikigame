<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/Button.svelte';
	import Card from '$lib/Card.svelte';
	import { MAX_NAME_LENGTH } from '$lib/protocol';
	import { ROOM_CODE_LENGTH } from '$lib/room-code';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let editingName = $state(false);
	const name = $derived(form?.name ?? data.session.name);
</script>

<svelte:head>
	<title>Lie to Me</title>
	<meta name="description" content="A bluffing game played with Wikipedia articles." />
</svelte:head>

<Card>
	<img
		class="mx-auto block w-64 max-w-full dark:hidden"
		src="/logo.png"
		alt="Lie to Me: the bullshitting game"
	/>
	<img
		class="mx-auto hidden w-64 max-w-full dark:block"
		src="/logo-dark.png"
		alt="Lie to Me: the bullshitting game"
	/>

	<div class="border-line mt-8 border-t pt-6">
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
				<label class="sr-only" for="name">Your name</label>
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
				<Button type="submit">Save</Button>
			</form>
		{:else}
			<p class="text-muted">
				You are <span class="text-ink font-semibold">{name}</span>.
				<button
					type="button"
					class="hover:text-ink cursor-pointer underline underline-offset-4"
					onclick={() => (editingName = true)}>Change</button
				>
			</p>
		{/if}
		{#if form?.nameError}
			<p class="text-accent mt-2 text-sm">{form.nameError}</p>
		{/if}
	</div>

	<div class="mt-6 grid gap-4">
		<form method="POST" action="?/host" use:enhance>
			<Button type="submit" class="w-full">Host a new game</Button>
		</form>
		{#if form?.hostError}
			<p class="text-accent text-sm">{form.hostError}</p>
		{/if}

		<div class="text-muted flex items-center gap-3 text-sm">
			<span class="bg-line h-px flex-1"></span>or join one<span class="bg-line h-px flex-1"></span>
		</div>

		<form method="POST" action="?/join" class="flex gap-2" use:enhance>
			<label class="sr-only" for="code">Room code</label>
			<input
				id="code"
				name="code"
				placeholder="Room code"
				maxlength={ROOM_CODE_LENGTH}
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
				required
				class="border-line bg-surface focus-visible:outline-accent min-w-0 flex-1 rounded-xl border
					px-3 py-2 text-center text-lg font-semibold tracking-[0.4em] uppercase
					focus-visible:outline-2"
			/>
			<Button type="submit" variant="secondary">Join</Button>
		</form>
		{#if form?.codeError}
			<p class="text-accent text-sm">{form.codeError}</p>
		{/if}
	</div>
</Card>
