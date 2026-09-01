/**
 * The Discord half of getting a player into a game.
 *
 * Inside an activity, Discord already knows who everyone is and which call they
 * are in, so this version does not run its own sign-in or lobby. The client
 * hands us the OAuth code the SDK gave it, we trade that with Discord for a
 * token, ask Discord who it belongs to, and mint the same signed player id the
 * rest of the game already understands.
 *
 * The id is derived from the Discord user rather than generated, so somebody
 * whose client crashes mid-round comes back to the seat they left rather than
 * arriving as a stranger.
 */

const OAUTH_TOKEN = 'https://discord.com/api/oauth2/token';
const CURRENT_USER = 'https://discord.com/api/users/@me';

export type DiscordUser = {
	id: string;
	username: string;
	/** The display name people actually see, when they have set one. */
	globalName: string | null;
	avatarUrl: string | null;
};

/** A player id that is stable for a given Discord account. */
export function playerIdForDiscordUser(userId: string): string {
	return `discord:${userId}`;
}

export async function exchangeCode(
	code: string,
	clientId: string,
	clientSecret: string
): Promise<string> {
	const response = await fetch(OAUTH_TOKEN, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'authorization_code',
			code
		})
	});

	if (!response.ok) {
		// Deliberately vague to the caller: a failed exchange is either a stale
		// code or a misconfigured app, and neither is the player's business.
		console.error('discord token exchange failed', response.status, await response.text());
		throw new Error('discord-token-exchange-failed');
	}

	const body = (await response.json()) as { access_token?: string };
	if (!body.access_token) throw new Error('discord-token-exchange-failed');
	return body.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
	const response = await fetch(CURRENT_USER, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!response.ok) {
		console.error('discord user lookup failed', response.status);
		throw new Error('discord-user-lookup-failed');
	}

	const user = (await response.json()) as {
		id: string;
		username: string;
		global_name?: string | null;
		avatar?: string | null;
	};

	return {
		id: user.id,
		username: user.username,
		globalName: user.global_name ?? null,
		avatarUrl: user.avatar
			? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
			: null
	};
}

/** What the table should call this person. */
export function displayName(user: DiscordUser): string {
	return user.globalName?.trim() || user.username;
}
