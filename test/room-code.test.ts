import { describe, expect, it } from 'vitest';
import { ROOM_CODE_LENGTH, createRoomCode, normaliseRoomCode } from '../src/lib/room-code';

describe('room codes', () => {
	it('are the advertised length and readable', () => {
		for (let i = 0; i < 200; i++) {
			const code = createRoomCode();
			expect(code).toHaveLength(ROOM_CODE_LENGTH);
			// No characters that are confusable when a code is read out loud.
			expect(code).not.toMatch(/[IOU01]/);
			expect(code).toMatch(/^[A-Z2-9]+$/);
		}
	});

	it('spread across the alphabet rather than clustering', () => {
		// Rejection sampling should leave no letter starved; a naive modulo would
		// favour the front of the alphabet.
		const seen = new Set<string>();
		for (let i = 0; i < 2000; i++) for (const character of createRoomCode()) seen.add(character);
		expect(seen.size).toBe(31);
	});

	it('accept what a player actually types', () => {
		const code = createRoomCode();
		expect(normaliseRoomCode(code.toLowerCase())).toBe(code);
		expect(normaliseRoomCode(`  ${code}  `)).toBe(code);
	});

	it('reject anything that cannot be a code', () => {
		expect(normaliseRoomCode('')).toBeNull();
		expect(normaliseRoomCode('ABC')).toBeNull();
		expect(normaliseRoomCode('ABCDE')).toBeNull();
		expect(normaliseRoomCode('ABC!')).toBeNull();
		// Excluded letters must not sneak back in through normalisation.
		expect(normaliseRoomCode('ABCI')).toBeNull();
		expect(normaliseRoomCode('ABC0')).toBeNull();
	});
});
