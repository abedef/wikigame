import { handleApi } from './router';
import type { Env } from './room';

/**
 * The development sidecar.
 *
 * `vite dev` runs the pages but cannot host a durable object, so during
 * development the game server runs here instead and the pages reach it
 * cross-origin at PUBLIC_GAME_SERVER. It serves the API and nothing else.
 * Production uses index.ts, where both halves are one worker.
 */
export { Room } from './room';

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const response = await handleApi(request, env, true);
		return response ?? new Response('The dev game server only serves /api.', { status: 404 });
	}
} satisfies ExportedHandler<Env>;
