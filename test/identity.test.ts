import { describe, expect, it } from 'vitest';
import { createPlayerId, signPlayerId, verifyPlayerToken } from '../src/lib/server/identity';

const SECRET = 'a-secret';

describe('player identity', () => {
	it('round-trips a signed id', async () => {
		const id = createPlayerId();
		const token = await signPlayerId(id, SECRET);
		expect(await verifyPlayerToken(token, SECRET)).toBe(id);
	});

	it('refuses a token signed with a different secret', async () => {
		const token = await signPlayerId(createPlayerId(), SECRET);
		expect(await verifyPlayerToken(token, 'another-secret')).toBeNull();
	});

	it('refuses a tampered id', async () => {
		const id = createPlayerId();
		const token = await signPlayerId(id, SECRET);
		const signature = token.slice(token.lastIndexOf('.') + 1);
		// This is the attack the signature exists to stop: claiming someone else's id.
		expect(await verifyPlayerToken(`some-other-id.${signature}`, SECRET)).toBeNull();
	});

	it('refuses a tampered signature', async () => {
		const id = createPlayerId();
		expect(await verifyPlayerToken(`${id}.AAAA`, SECRET)).toBeNull();
	});

	it('refuses malformed tokens without throwing', async () => {
		for (const token of ['', '.', 'no-dot', '.sig', 'id.', 'id.!!!not-base64!!!']) {
			expect(await verifyPlayerToken(token, SECRET)).toBeNull();
		}
	});
});
