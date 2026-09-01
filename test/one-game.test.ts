import { describe, expect, it } from 'vitest';

/**
 * The game is played in two places — the website and the Discord activity — and
 * the point of `Table.svelte` is that a round is described once. These guard
 * that arrangement, because the last time the two shells were separate they
 * drifted within the hour: the activity lost the control that abandons a stuck
 * round, which is the only way out of one.
 *
 * The suite runs inside workerd and has no filesystem, so the sources are
 * inlined at build time rather than read at run time.
 */
const routes = import.meta.glob('/src/routes/**/*.svelte', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const table = import.meta.glob('/src/lib/game/Table.svelte', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const CLIENTS = ['/src/routes/room/[code]/+page.svelte', '/src/routes/discord/+page.svelte'];

describe('one description of a round', () => {
	it('is what both clients render', () => {
		for (const client of CLIENTS) {
			expect(routes[client], `${client} should exist`).toBeDefined();
			expect(routes[client], `${client} should render the shared table`).toContain('<Table');
		}
	});

	it('is not bypassed by a route reaching for a stage directly', () => {
		// A route importing Picking or Reveal itself is the shape the drift took:
		// it works, it looks harmless, and the other client silently stops
		// matching it.
		const offenders: string[] = [];
		for (const [path, source] of Object.entries(routes)) {
			for (const [, name] of source.matchAll(/from '\$lib\/game\/(\w+)\.svelte'/g)) {
				if (name !== 'Table') offenders.push(`${path} imports ${name}`);
			}
		}
		expect(offenders, 'routes should go through Table so both clients stay in step').toEqual([]);
	});

	it('keeps the recovery control, which is the one that went missing', () => {
		expect(Object.values(table)[0]).toContain('abort-round');
	});
});
