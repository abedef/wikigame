import { LOCALES, LOCALE_COOKIE, resolveLocale } from '$lib/i18n';
import type { Handle } from '@sveltejs/kit';

const escape = (value: string) =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/**
 * The link preview. This game travels by somebody pasting a URL into a group
 * chat, so the card that paste turns into is most of the first impression.
 * Built here rather than in a page's <svelte:head> because og:url and og:image
 * have to be absolute, and only the request knows the origin.
 */
function socialTags(origin: string, locale: keyof typeof LOCALES): string {
	const text = LOCALES[locale];
	const tags: [string, string][] = [
		['og:type', 'website'],
		['og:site_name', text.brand],
		['og:title', text.brand],
		['og:description', text.meta.description],
		['og:url', origin],
		['og:image', `${origin}/og.png`],
		['og:image:width', '1200'],
		['og:image:height', '630'],
		['og:locale', locale],
		['twitter:card', 'summary_large_image'],
		['twitter:title', text.brand],
		['twitter:description', text.meta.description],
		['twitter:image', `${origin}/og.png`]
	];
	return tags
		.map(([property, content]) =>
			property.startsWith('og:')
				? `<meta property="${property}" content="${escape(content)}" />`
				: `<meta name="${property}" content="${escape(content)}" />`
		)
		.join('\n\t\t');
}

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

	// Scrapers are served over TLS even when the worker sees a plain request, and
	// an http:// image URL in the card gets dropped by some of them.
	const url = new URL(event.url);
	if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') url.protocol = 'https:';

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html
				.replace('%lang%', event.locals.locale)
				.replace('%social%', socialTags(url.origin, event.locals.locale))
	});
};
