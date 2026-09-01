import { env as publicEnv } from '$env/dynamic/public';
import { normaliseRoomCode } from '$lib/room-code';
import { reserveRoomCode } from '$lib/server/rooms';
import { saveName } from '$lib/server/session';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

/**
 * These are real form actions rather than client-side handlers, so hosting and
 * joining still work if the page's JavaScript has not loaded yet.
 */
export const actions: Actions = {
	name: async ({ request, cookies }) => {
		const form = await request.formData();
		const name = saveName(cookies, String(form.get('name') ?? ''));
		if (!name) return fail(400, { nameError: 'Names need at least one character.' });
		return { name };
	},

	join: async ({ request }) => {
		const form = await request.formData();
		const code = normaliseRoomCode(String(form.get('code') ?? ''));
		if (!code) return fail(400, { codeError: 'Room codes are four letters and numbers.' });
		redirect(303, `/room/${code}`);
	},

	host: async ({ url, fetch, platform }) => {
		let code: string | null = null;

		try {
			const rooms = platform?.env?.ROOM;
			if (rooms) {
				// In production this action runs inside the very worker that hosts the
				// durable object, so it talks to the binding directly. It must not go
				// over HTTP: a worker's subrequest to its own hostname does not
				// re-enter the worker, it is answered by the static asset handler,
				// which has no /api/rooms and returns 404.
				code = await reserveRoomCode(rooms);
			} else {
				// `vite dev` has no bindings, so in development the durable object is
				// reached across origins in the wrangler sidecar.
				const origin = publicEnv.PUBLIC_GAME_SERVER?.trim() || url.origin;
				const response = await fetch(`${origin}/api/rooms`, { method: 'POST' });
				if (!response.ok) throw new Error(`game server said ${response.status}`);
				({ code } = (await response.json()) as { code: string });
			}
		} catch (cause) {
			console.error('could not reserve a room code', cause);
		}

		if (!code) {
			return fail(502, { hostError: 'The game server is not answering. Try again in a moment.' });
		}

		redirect(303, `/room/${code}`);
	}
};
