import { getContext, setContext } from 'svelte';
import { en, type Messages } from './en';

export type { Messages };

/**
 * Locales the interface is available in. Adding one means adding a file that
 * satisfies `Messages` and an entry here; TypeScript will not let it be
 * registered until every message exists.
 */
export const LOCALES = { en } satisfies Record<string, Messages>;

export type Locale = keyof typeof LOCALES;

export const DEFAULT_LOCALE: Locale = 'en';

/** The cookie a player's explicit choice is remembered in, if they make one. */
export const LOCALE_COOKIE = 'locale';

function isLocale(value: string): value is Locale {
	return Object.hasOwn(LOCALES, value);
}

/**
 * Pick a locale for a request.
 *
 * An explicit choice wins. Otherwise the browser's Accept-Language header is
 * read in preference order, matching a bare language before giving up, so that
 * `en-CA` finds `en`. Falls back to English rather than failing.
 */
export function resolveLocale(header: string | null, chosen?: string | null): Locale {
	if (chosen && isLocale(chosen)) return chosen;

	for (const part of (header ?? '').split(',')) {
		// "en-CA;q=0.9" -> "en-CA"
		const tag = part.split(';')[0]!.trim().toLowerCase();
		if (!tag) continue;
		if (isLocale(tag)) return tag;
		const base = tag.split('-')[0]!;
		if (isLocale(base)) return base;
	}

	return DEFAULT_LOCALE;
}

/**
 * Messages travel through Svelte's context rather than a module-level variable.
 * On a worker, module scope is shared between concurrent requests, so a locale
 * kept there would leak from one player's render into another's. Context is per
 * component tree, which is per request.
 */
const MESSAGES = Symbol('messages');

export function provideMessages(locale: Locale): Messages {
	const messages = LOCALES[locale];
	setContext(MESSAGES, messages);
	return messages;
}

/** The messages for the current render. Call during component initialisation. */
export function t(): Messages {
	const messages = getContext<Messages | undefined>(MESSAGES);
	if (!messages) throw new Error('t() was called outside the layout that provides messages.');
	return messages;
}
