import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// Deliberately not wrangler.jsonc: the adapter emits its worker to that
		// config's `main`, which is our own entry point. See wrangler.build.jsonc.
		adapter: adapter({ config: 'wrangler.build.jsonc' })
	}
};

export default config;
