import { defineConfig, devices } from '@playwright/test';

const PORT = 8787;
const baseURL = `http://localhost:${PORT}`;

/**
 * These drive a real browser against the production shape of the app — the
 * worker serving the pages and the durable object behind them — because the
 * things they are here to catch do not exist anywhere else.
 *
 * The unit suite talks to the durable object over WebSocket and never renders
 * anything, so it cannot see a control that stopped being a control, a layout
 * that overflows a phone, or an article leaking into a page it should not be
 * on. All three have happened.
 */
export default defineConfig({
	testDir: 'e2e',
	// Rounds wait on a real clock and the deal fetches from Wikipedia.
	timeout: 90_000,
	expect: { timeout: 20_000 },
	// A round involves several browsers and a live durable object; running specs
	// in parallel against one worker makes failures hard to attribute.
	workers: 1,
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['list']] : [['list']],
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			// A phone, because that is what this is played on and where the
			// affordance bugs were.
			name: 'mobile',
			use: { ...devices['Pixel 7'] }
		}
	],
	webServer: [
		{
			// Deterministic articles, so a round is not waiting on Wikipedia and a
			// failure here is always our own.
			command: 'node e2e/wikipedia-stub.mjs',
			url: 'http://localhost:8788/api/rest_v1/page/random/summary',
			reuseExistingServer: !process.env.CI,
			timeout: 20_000
		},
		{
			command: 'npm run preview:e2e',
			url: baseURL,
			reuseExistingServer: !process.env.CI,
			// `preview` builds before it serves.
			timeout: 180_000,
			stdout: 'pipe',
			stderr: 'pipe'
		}
	]
});
