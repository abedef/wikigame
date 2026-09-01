import { normaliseRoomCode } from '$lib/room-code';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const code = normaliseRoomCode(params.code);
	if (!code) error(404, 'That is not a room code.');
	// Codes are spoken aloud and typed in any case; settle on one spelling so
	// everyone in the room shares a URL.
	if (code !== params.code) redirect(307, `/room/${code}`);

	return { code };
};
