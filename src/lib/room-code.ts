/**
 * Room codes are read aloud and typed in by hand, so the alphabet leaves out
 * characters that are easy to confuse when spoken or seen: I/1, O/0, and U
 * (which is easily heard as "you").
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTVWXYZ23456789';

export const ROOM_CODE_LENGTH = 4;

export function createRoomCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
	let code = '';
	// The alphabet has 31 characters and bytes run to 255, so a plain modulo would
	// favour the first few letters. Rejection sampling keeps every code equally likely.
	for (let index = 0; index < ROOM_CODE_LENGTH; index++) {
		let byte = bytes[index];
		while (byte >= 256 - (256 % ALPHABET.length)) {
			byte = crypto.getRandomValues(new Uint8Array(1))[0];
		}
		code += ALPHABET[byte % ALPHABET.length];
	}
	return code;
}

/** Accept what a player typed, in any case, or null if it cannot be a code. */
export function normaliseRoomCode(input: string): string | null {
	const code = input.trim().toUpperCase();
	if (code.length !== ROOM_CODE_LENGTH) return null;
	for (const character of code) if (!ALPHABET.includes(character)) return null;
	return code;
}
