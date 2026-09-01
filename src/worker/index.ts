import { handleApi } from './router';
import { Room } from './room';
import sveltekit from 'sveltekit-worker';
import type { Env } from './room';

/**
 * The production entry point.
 *
 * SvelteKit's adapter generates a worker but gives us no way to add exports to
 * it, and a durable object has to be exported from the worker's own module. So
 * this file wraps the generated worker: the game API is handled here and
 * everything else is passed through to SvelteKit untouched.
 */
export { Room };

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const response = await handleApi(request, env);
		if (response) return response;
		return sveltekit.fetch(request, env, ctx);
	}
} satisfies ExportedHandler<Env>;
