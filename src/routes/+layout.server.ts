import { loadSession } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, locals }) => {
	return { session: await loadSession(cookies), locale: locals.locale };
};
