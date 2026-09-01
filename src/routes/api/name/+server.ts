import { saveName } from '$lib/server/session';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** Remember a display name across visits. The room is told separately, over the socket. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
	const name = saveName(cookies, String(body?.name ?? ''));
	if (!name) return json({ error: 'That name is empty.' }, { status: 400 });
	return json({ name });
};
