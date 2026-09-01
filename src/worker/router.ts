import { verifyPlayerToken } from '../lib/server/identity';
import { reserveRoomCode } from '../lib/server/rooms';
import { normaliseRoomCode } from '../lib/room-code';
import type { Env } from './room';

/**
 * Origins allowed to call the development sidecar. In production the pages and
 * the game server are one worker on one origin, so no cross-origin access is
 * needed or granted.
 */
const DEV_ORIGINS = new Set([
	'http://localhost:5173',
	'http://127.0.0.1:5173',
	'http://localhost:4173',
	'http://127.0.0.1:4173'
]);

function corsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('Origin');
	if (!origin || !DEV_ORIGINS.has(origin)) return {};
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		Vary: 'Origin'
	};
}

function json(body: unknown, init: ResponseInit = {}, cors: Record<string, string> = {}): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: { 'Content-Type': 'application/json', ...cors, ...init.headers }
	});
}

/**
 * Handle the game API. Returns null for anything that is not ours, so the
 * caller can fall through to SvelteKit.
 *
 * @param allowCors adds development CORS headers; only the dev sidecar sets it.
 */
export async function handleApi(
	request: Request,
	env: Env,
	allowCors = false
): Promise<Response | null> {
	const url = new URL(request.url);
	if (!url.pathname.startsWith('/api/')) return null;

	const cors = allowCors ? corsHeaders(request) : {};

	if (request.method === 'OPTIONS' && allowCors) {
		return new Response(null, { status: 204, headers: cors });
	}

	// Reserve a room code. The room itself springs into being when its host
	// actually connects, so a code nobody uses costs nothing.
	if (url.pathname === '/api/rooms' && request.method === 'POST') {
		const code = await reserveRoomCode(env.ROOM);
		if (!code) return json({ error: 'Could not find a free room code.' }, { status: 503 }, cors);
		return json({ code }, { status: 201 }, cors);
	}

	// A room on the website is addressed by its code. A room inside Discord is
	// addressed by the activity instance everybody launched together: there is no
	// code to read out, because Discord already put them in the same place. The
	// name is namespaced so the two can never collide.
	const ws = url.pathname.match(/^\/api\/(room|discord)\/([^/]+)\/ws$/);
	if (ws) {
		const [, kind, raw] = ws;
		let room: string | null;
		if (kind === 'discord') {
			// Opaque to us, so accept only a conservative shape rather than letting
			// any string name a durable object.
			const instance = decodeURIComponent(raw);
			room = /^[A-Za-z0-9_-]{1,64}$/.test(instance) ? `discord:${instance}` : null;
		} else {
			room = normaliseRoomCode(decodeURIComponent(raw));
		}
		if (!room) return json({ error: 'That is not a room.' }, { status: 400 }, cors);

		if (!env.SESSION_SECRET) {
			console.error('SESSION_SECRET is not set; refusing to accept players.');
			return json({ error: 'The server is misconfigured.' }, { status: 500 }, cors);
		}

		const token = url.searchParams.get('t') ?? '';
		const playerId = await verifyPlayerToken(token, env.SESSION_SECRET);
		if (!playerId) return json({ error: 'Bad player token.' }, { status: 401 }, cors);

		// Hand the durable object an id it can trust, having checked the signature
		// here. Replace the token so a verified id is the only thing that travels on.
		const forwarded = new URL(request.url);
		forwarded.pathname = '/ws';
		forwarded.searchParams.delete('t');
		forwarded.searchParams.set('pid', playerId);
		forwarded.searchParams.set('code', room);

		return env.ROOM.getByName(room).fetch(new Request(forwarded, request));
	}

	// Not one of ours. SvelteKit owns every other /api route.
	return null;
}
