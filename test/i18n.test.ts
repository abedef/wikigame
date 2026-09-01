import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, LOCALES, resolveLocale } from '../src/lib/i18n';
import { en } from '../src/lib/i18n/en';

describe('locale negotiation', () => {
	it('takes an explicit choice over the header', () => {
		expect(resolveLocale('fr-FR,fr;q=0.9', 'en')).toBe('en');
	});

	it('ignores an explicit choice it does not have', () => {
		expect(resolveLocale(null, 'kl')).toBe(DEFAULT_LOCALE);
	});

	it('matches a region tag to its base language', () => {
		expect(resolveLocale('en-CA,en;q=0.9')).toBe('en');
	});

	it('reads the header in preference order', () => {
		// Once a second locale exists this is the case that proves order is
		// honoured rather than the first supported entry winning by accident.
		expect(resolveLocale('kl-GL;q=1.0,en;q=0.8')).toBe('en');
	});

	it('falls back when nothing in the header is available', () => {
		expect(resolveLocale('kl,xh;q=0.8')).toBe(DEFAULT_LOCALE);
	});

	it('survives a missing or malformed header', () => {
		expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
		expect(resolveLocale('')).toBe(DEFAULT_LOCALE);
		expect(resolveLocale(',,;q=,')).toBe(DEFAULT_LOCALE);
	});
});

describe('message catalogue', () => {
	it('registers the default locale', () => {
		expect(Object.hasOwn(LOCALES, DEFAULT_LOCALE)).toBe(true);
	});

	it('pluralises against the count rather than appending an s', () => {
		expect(en.lobby.waitingForPlayers(1)).toContain('1 more player.');
		expect(en.lobby.waitingForPlayers(2)).toContain('2 more players.');
	});

	it('joins tied winners as a list', () => {
		expect(en.finished.tie(['Ada', 'Cleo'])).toBe('Ada and Cleo tie');
		expect(en.finished.tie(['Ada', 'Cleo', 'Brendan'])).toBe('Ada, Cleo, and Brendan tie');
	});

	it('has a message for every error the server can send', () => {
		// The table is typed as Record<ErrorCode, string>, so this failing means
		// a code was added to the protocol without being given words.
		for (const message of Object.values(en.errors)) expect(message.length).toBeGreaterThan(0);
	});
});
