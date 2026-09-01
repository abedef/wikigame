import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { cleanName, randomName } from '../names';
import { createPlayerId, signPlayerId, verifyPlayerToken } from './identity';

const IDENTITY_COOKIE = 'player';
const NAME_COOKIE = 'player_name';
const A_YEAR = 60 * 60 * 24 * 365;

export type Session = {
	/** The signed `<id>.<signature>` pair. The client replays this to the game server. */
	token: string;
	playerId: string;
	name: string;
};

function secret(): string {
	if (!env.SESSION_SECRET) {
		throw new Error(
			'SESSION_SECRET is not set. Copy .env.example to .env and generate one with `openssl rand -hex 32`.'
		);
	}
	return env.SESSION_SECRET;
}

const cookieOptions = {
	path: '/',
	httpOnly: false,
	sameSite: 'lax',
	secure: !dev,
	maxAge: A_YEAR
} as const;

/**
 * Return the player this browser already is, minting a new identity if it does
 * not have a valid one. Called from the root layout, so every page has it.
 */
export async function loadSession(cookies: Cookies): Promise<Session> {
	const existing = cookies.get(IDENTITY_COOKIE);
	let playerId = existing ? await verifyPlayerToken(existing, secret()) : null;
	let token = existing;

	// Either there is no cookie, or it was signed with a secret we no longer use.
	if (!playerId || !token) {
		playerId = createPlayerId();
		token = await signPlayerId(playerId, secret());
		cookies.set(IDENTITY_COOKIE, token, cookieOptions);
	}

	let name = cleanName(cookies.get(NAME_COOKIE) ?? '');
	if (!name) {
		name = randomName();
		cookies.set(NAME_COOKIE, name, cookieOptions);
	}

	return { token, playerId, name };
}

/** Persist a chosen display name. Returns what was actually stored. */
export function saveName(cookies: Cookies, input: string): string | null {
	const name = cleanName(input);
	if (!name) return null;
	cookies.set(NAME_COOKIE, name, cookieOptions);
	return name;
}
