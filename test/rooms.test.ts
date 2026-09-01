import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { ROOM_CODE_LENGTH } from '../src/lib/room-code';
import { reserveRoomCode, type RoomNamespace } from '../src/lib/server/rooms';

/** A namespace whose first `occupied` rooms report players in them. */
function stubNamespace(occupied: number): { rooms: RoomNamespace; tried: string[] } {
	const tried: string[] = [];
	return {
		tried,
		rooms: {
			getByName(name: string) {
				tried.push(name);
				const busy = tried.length <= occupied;
				return { describe: async () => ({ players: busy ? [{}] : [] }) };
			}
		}
	};
}

describe('reserving a room code', () => {
	it('works against the real durable object namespace', async () => {
		// Also pins the structural contract: the SvelteKit page action holds this
		// binding as a RoomNamespace, so a real namespace has to satisfy it.
		const code = await reserveRoomCode(env.ROOM);
		expect(code).not.toBeNull();
		expect(code).toHaveLength(ROOM_CODE_LENGTH);
	});

	it('takes the first free code', async () => {
		const { rooms, tried } = stubNamespace(0);
		expect(await reserveRoomCode(rooms)).toBe(tried[0]);
		expect(tried).toHaveLength(1);
	});

	it('passes over codes that are already in use', async () => {
		const { rooms, tried } = stubNamespace(2);
		const code = await reserveRoomCode(rooms);
		expect(tried).toHaveLength(3);
		expect(code).toBe(tried[2]);
	});

	it('gives up rather than looping forever', async () => {
		const { rooms, tried } = stubNamespace(Number.MAX_SAFE_INTEGER);
		expect(await reserveRoomCode(rooms, 4)).toBeNull();
		expect(tried).toHaveLength(4);
	});
});
