import { getRoomByCode, joinRoomByCode, Stage } from '$lib';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// If the room exists and is empty, join it
	// If the room is not empty, provide a prompt to join it
	const room = await getRoomByCode(event.params.code);
	if (room && room.stage === Stage.PREGAME) {
		const identity = event.cookies.get('id');
		if (!identity) return { room };

		const joinedRoom = await joinRoomByCode(identity, room.code);
		return { room: joinedRoom };
	}

	return { room };
};
