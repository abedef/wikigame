<script lang="ts">
	import { goto } from '$app/navigation';
	import { createRoom } from '$lib';
	import type { PageProps } from './$types';
	import PocketBase from 'pocketbase';

	const pb = new PocketBase('https://pocketbase.genieindex.ca');

	let { data }: PageProps = $props();

	let player = $state(data.player);

	function changeName() {
		if (player) {
			player.name = prompt('What do you want your name to be?', player.name) ?? player.name;
			pb.collection('players').update(player.id, player);
		}
	}

	function joinRoom() {
		const code = prompt('Enter your room code', '00000');
		if (code) goto(`/room/${code}`);
	}

	async function hostRoom() {
		const room = await createRoom();
		if (room) goto(`/room/${room.code}`);
	}
</script>

<img
	class="block w-1/2 max-w-xs dark:hidden"
	src="logo.png"
	alt="Lie to Me: The Bull$#!&^ing Game"
/>
<img
	class="hidden w-1/2 max-w-xs dark:block"
	src="logo-dark.png"
	alt="Lie to Me: The Bull$#!&^ing Game"
/>

<p>
	hello <span class="italic">{player?.name}</span>
	<button class="font-bold hover:cursor-pointer" onclick={changeName}>change your name</button>
</p>

<div class="flex gap-2">
	<button class="font-bold hover:cursor-pointer" onclick={hostRoom}>host</button> a room or
	<button class="font-bold hover:cursor-pointer" onclick={joinRoom}>join</button> an existing one
</div>
