<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import PocketBase from 'pocketbase';
	import type { Room } from '$lib';

	const { data }: PageProps = $props();

	const pb = new PocketBase('https://pocketbase.genieindex.ca');

	let room = $state(data.room);

	async function subscribe(id: string) {
		console.log(`Subscribing to room ${data.room?.id}`);
		pb.collection<Room>('rooms').subscribe(
			id,
			(e) => {
				console.log(e.action);
				console.log(e.record);
				room = e.record;
			},
			{
				expand: 'players'
				/* other options like: filter, expand, custom headers, etc. */
			}
		);
		room = await pb.collection<Room>('rooms').getOne(id, { expand: 'players' });
	}

	onMount(() => data.room && subscribe(data.room.id));
</script>

{#if room}
	<div class="max-w-sm overflow-hidden rounded-md shadow-lg dark:border-2 dark:border-gray-700">
		<div class="px-6 py-4">
			<div class="mb-2 text-xl font-bold">Room {room.code}</div>
			<p class="text-base">The game will begin once everyone has indicated that they are ready.</p>
		</div>
		<div class="px-6 pt-4 pb-2">
			<div class="mb-2 text-xl font-bold">Players ({room.players.length})</div>
			{#each room.expand.players as player}
				<span
					class="mr-2 mb-2 inline-block rounded-full bg-gray-200 px-3 py-1 text-sm font-semibold text-gray-700"
					>{player.name}{player.id === data.player?.id ? ' (you)' : ''}</span
				>
			{/each}
			<p>to change your name, <a class="font-bold" href="/">go back</a> then rejoin</p>
		</div>
	</div>
{:else}
	<p>couldn't find a room with that code</p>
	<a class="font-bold" href="/">go back</a>
{/if}
