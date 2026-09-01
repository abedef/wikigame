import { LOCALES } from '$lib/i18n';
import { env as publicEnv } from '$env/dynamic/public';
import { normaliseRoomCode } from '$lib/room-code';
import { reserveRoomCode } from '$lib/server/rooms';
import { saveName } from '$lib/server/session';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * These are real form actions rather than client-side handlers, so hosting and
 * joining still work if the page's JavaScript has not loaded yet.
 */
/**
 * Discord loads an activity at the root of the mapped domain and appends its own
 * query parameters, so the front page is where a launch actually lands. Send it
 * on to the activity, which signs in through Discord instead of a cookie and
 * takes its room from the call rather than a code.
 */
export const load: PageServerLoad = async ({ url }) => {
	if (url.searchParams.has('frame_id')) {
		redirect(303, `/discord${url.search}`);
	}
	return {};
};

export const actions: Actions = {
	name: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const name = saveName(cookies, String(form.get('name') ?? ''));
		if (!name) return fail(400, { nameError: LOCALES[locals.locale].landing.nameTooShort });
		return { name };
	},

	join: async ({ request, locals }) => {
		const form = await request.formData();
		const code = normaliseRoomCode(String(form.get('code') ?? ''));
		if (!code) return fail(400, { codeError: LOCALES[locals.locale].landing.badCode });
		redirect(303, `/room/${code}`);
	},

	host: async ({ url, fetch, platform, locals }) => {
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
			return fail(502, { hostError: LOCALES[locals.locale].landing.serverSilent });
		}

		redirect(303, `/room/${code}`);
	}
};
