/**
 * Types for the worker SvelteKit's adapter emits at `.svelte-kit/cloudflare/_worker.js`.
 *
 * That file only exists after `vite build`, so wrangler aliases the bare specifier
 * `sveltekit-worker` to it at bundle time (see wrangler.jsonc) and tsconfig.worker.json
 * points the same specifier here. The worker entry then typechecks on a clean checkout.
 */
declare const handler: {
	fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>;
};

export default handler;
