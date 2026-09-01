import { describe, expect, it } from 'vitest';
import { canonicalRedirect } from '../src/lib/canonical-host';

const CANON = 'citationneededgame.com';

describe('canonical host', () => {
	it('serves the canonical host as it is', () => {
		expect(canonicalRedirect(`https://${CANON}/`, CANON)).toBeNull();
	});

	it('sends the spare domains to it', () => {
		expect(canonicalRedirect('https://citationneeded.ca/', CANON)).toBe(`https://${CANON}/`);
		expect(canonicalRedirect('https://www.citationneeded.ca/', CANON)).toBe(`https://${CANON}/`);
		expect(canonicalRedirect(`https://www.${CANON}/`, CANON)).toBe(`https://${CANON}/`);
	});

	it('keeps the path and query, so a room link still lands in that room', () => {
		expect(canonicalRedirect('https://citationneeded.ca/room/N2D9?x=1', CANON)).toBe(
			`https://${CANON}/room/N2D9?x=1`
		);
	});

	it('leaves development alone', () => {
		expect(canonicalRedirect('http://localhost:8787/room/N2D9', CANON)).toBeNull();
		expect(canonicalRedirect('http://127.0.0.1:8787/', CANON)).toBeNull();
	});

	it('does nothing when no canonical host is configured', () => {
		// Fail open: an unset var must not take the site down.
		expect(canonicalRedirect('https://anything.example/', undefined)).toBeNull();
		expect(canonicalRedirect('https://anything.example/', '')).toBeNull();
	});
});
