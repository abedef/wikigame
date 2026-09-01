import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

/** Increments so every draw is a distinguishable article. */
let drawn = 0;

/**
 * Everything the worker fetches goes through here, so the tests never touch the
 * network and a round is deterministic. Anything other than the Wikipedia
 * endpoint is refused rather than quietly allowed through.
 */
function wikipediaStub(request: Request): Response {
	const url = new URL(request.url);
	if (url.hostname === 'en.wikipedia.org' && url.pathname.endsWith('/page/random/summary')) {
		drawn++;
		return Response.json({
			type: 'standard',
			title: `Article ${drawn}`,
			description: `the ${drawn}th thing`,
			extract: `A sufficiently long description of article ${drawn}. `.repeat(6),
			content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/Article_${drawn}` } },
			thumbnail: { source: 'https://upload.wikimedia.org/t.png' }
		});
	}
	return new Response(`tests do not reach the network: ${request.url}`, { status: 403 });
}

// The tests run inside workerd rather than node, so the durable object under
// test is the same code, on the same runtime, as the deployed one.
export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.dev.jsonc' },
			miniflare: {
				bindings: { SESSION_SECRET: 'test-secret-not-used-in-production' },
				outboundService: wikipediaStub
			}
		})
	],
	test: {
		include: ['test/**/*.test.ts']
	}
});
