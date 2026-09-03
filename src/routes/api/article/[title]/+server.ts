import { env } from '$env/dynamic/private';
import { readableArticle } from '$lib/server/article-html';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_USER_AGENT = 'CitationNeeded/0.1 (https://github.com/abedef/wikigame)';

/**
 * Serves a link-free copy of one article for the in-game reader.
 *
 * The headers are the actual guard rails, not the markup rewriting: no scripts,
 * no navigation, nothing loaded from anywhere else, and framable only by us.
 */
export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
	const language = /^[a-z]{2,8}$/.test(url.searchParams.get('lang') ?? '')
		? url.searchParams.get('lang')!
		: 'en';

	const { html, status } = await readableArticle(
		params.title,
		language,
		env.WIKIPEDIA_USER_AGENT || DEFAULT_USER_AGENT
	);
	if (status !== 200) throw error(status === 404 ? 404 : 502, 'That article could not be fetched.');

	setHeaders({
		'Content-Type': 'text/html; charset=utf-8',
		// Wikipedia's stylesheet and its pictures now come from here too, so both
		// are allowed from our own origin and from nowhere else. Still no scripts,
		// no navigation, and framable only by us.
		'Content-Security-Policy': [
			"default-src 'none'",
			"style-src 'self' 'unsafe-inline'",
			"img-src 'self' data:",
			"font-src 'self' data:",
			"frame-ancestors 'self'",
			"form-action 'none'",
			"base-uri 'none'"
		].join('; '),
		'X-Frame-Options': 'SAMEORIGIN',
		'Referrer-Policy': 'no-referrer',
		// Article text is stable enough to keep for a round, and this is fetched
		// once per reader per round.
		'Cache-Control': 'public, max-age=600'
	});
	return new Response(html);
};
