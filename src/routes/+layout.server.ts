import { createPlayer, getPlayerByIdentifier, getRoomByIdentifier } from '$lib';
import type { LayoutServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

const maxAge = 60 * 60 * 24 * 30;

export const load: LayoutServerLoad = async (event) => {
	const id = event.cookies.get('id');
	if (!id) {
		const player = await createPlayer();
		if (!player) return fail(500);
		event.cookies.set('id', player.id, { path: '/', maxAge });
		return { player };
	}

	const player = await getPlayerByIdentifier(id);
	if (!player) {
		const player = await createPlayer();
		if (!player) return fail(500);
		event.cookies.set('id', player.id, { path: '/', maxAge });
		return { player };
	}

	if (!player.room) return { player };

	const room = await getRoomByIdentifier(player.room);
	if (!room) return { player };

	return { player, room };
};
