/**
 * Player identity.
 *
 * A player is just an opaque id. The browser holds that id in a cookie alongside
 * an HMAC of it, so the pair cannot be forged: a client can discard its identity
 * or refuse to send one, but it cannot invent someone else's. The game server
 * verifies the signature before letting a socket act as that player.
 *
 * Display names are deliberately *not* signed. They are cosmetic, chosen freely,
 * and nothing is authorised on the strength of one.
 */

const encoder = new TextEncoder();

/** Cached per secret, since importKey is called on every request otherwise. */
const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
	let key = keyCache.get(secret);
	if (!key) {
		key = crypto.subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify']
		);
		keyCache.set(secret, key);
	}
	return key;
}

function toBase64Url(bytes: ArrayBuffer): string {
	let binary = '';
	for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

// Backed by a plain ArrayBuffer rather than ArrayBufferLike, which is what
// crypto.subtle accepts as a BufferSource.
function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
	const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
	return bytes;
}

export function createPlayerId(): string {
	return crypto.randomUUID();
}

/** Produce the `<id>.<signature>` token the browser stores and replays. */
export async function signPlayerId(id: string, secret: string): Promise<string> {
	const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(id));
	return `${id}.${toBase64Url(signature)}`;
}

/**
 * Recover the player id from a token, or null if it was not signed with `secret`.
 * `crypto.subtle.verify` compares in constant time.
 */
export async function verifyPlayerToken(token: string, secret: string): Promise<string | null> {
	const separator = token.lastIndexOf('.');
	if (separator <= 0) return null;

	const id = token.slice(0, separator);
	let signature: Uint8Array<ArrayBuffer>;
	try {
		signature = fromBase64Url(token.slice(separator + 1));
	} catch {
		return null;
	}

	const valid = await crypto.subtle.verify(
		'HMAC',
		await hmacKey(secret),
		signature,
		encoder.encode(id)
	);
	return valid ? id : null;
}
