import { LOCALE_COOKIE, resolveLocale } from '$lib/i18n';
import type { Handle } from '@sveltejs/kit';

/**
 * Settle the locale once per request, before any load runs, and stamp it on the
 * document. A page whose <html lang> disagrees with its text is read wrongly by
 * screen readers and offered up for translation by the browser.
 */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = resolveLocale(
		event.request.headers.get('accept-language'),
		event.cookies.get(LOCALE_COOKIE)
	);

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};
