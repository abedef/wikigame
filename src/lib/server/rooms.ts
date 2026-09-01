import { createRoomCode } from '../room-code';

/**
 * The part of the ROOM durable object namespace this needs, written structurally
 * so the file can be imported by the SvelteKit server as well as by the worker.
 * A full `DurableObjectNamespace<Room>` satisfies it.
 */
export type RoomNamespace = {
	getByName(name: string): { describe(): Promise<{ players: unknown[] }> };
};

/**
 * Find a room code nobody is using.
 *
 * The room itself is not created here; it comes into being when its host
 * connects. A code that nobody ends up using costs nothing.
 */
export async function reserveRoomCode(rooms: RoomNamespace, attempts = 5): Promise<string | null> {
	for (let attempt = 0; attempt < attempts; attempt++) {
		const code = createRoomCode();
		const room = await rooms.getByName(code).describe();
		if (room.players.length === 0) return code;
	}
	return null;
}
