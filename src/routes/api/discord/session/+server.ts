import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	displayName,
	exchangeCode,
	fetchDiscordUser,
	playerIdForDiscordUser
} from '$lib/server/discord';
import { signPlayerId } from '$lib/server/identity';
import { cleanName } from '$lib/names';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Turn the SDK's OAuth code into everything the activity needs to start
 * playing: an access token for Discord's own APIs, and one of our signed player
 * tokens so the same socket the website uses will accept it.
 */
export const POST: RequestHandler = async ({ request }) => {
	if (!env.DISCORD_CLIENT_SECRET) {
		console.error('DISCORD_CLIENT_SECRET is not set; the activity cannot sign anyone in.');
		throw error(500, 'The activity is not configured.');
	}
	if (!env.SESSION_SECRET) throw error(500, 'The activity is not configured.');
	const clientId = publicEnv.PUBLIC_DISCORD_CLIENT_ID;
	if (!clientId) {
		console.error('PUBLIC_DISCORD_CLIENT_ID is not set; the activity cannot sign anyone in.');
		throw error(500, 'The activity is not configured.');
	}

	const body = (await request.json().catch(() => null)) as { code?: string } | null;
	if (!body?.code) throw error(400, 'No authorization code.');

	let accessToken: string;
	let user;
	try {
		accessToken = await exchangeCode(body.code, clientId, env.DISCORD_CLIENT_SECRET);
		user = await fetchDiscordUser(accessToken);
	} catch {
		throw error(502, 'Discord would not confirm who you are.');
	}

	return json({
		accessToken,
		// The same shape the game server expects from a browser player.
		token: await signPlayerId(playerIdForDiscordUser(user.id), env.SESSION_SECRET),
		name: cleanName(displayName(user)),
		avatarUrl: user.avatarUrl
	});
};
