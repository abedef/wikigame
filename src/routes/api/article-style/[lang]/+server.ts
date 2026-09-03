import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_USER_AGENT = 'CitationNeeded/0.1 (https://github.com/abedef/wikigame)';

/**
 * Wikipedia's own mobile stylesheets, re-served from our origin.
 *
 * The activity may only load what comes from its own proxy domain, and the
 * article is framed from here in any case, so the styling has to travel the
 * same road the markup does. All three answer with an open CORS header, which
 * is what makes this possible at all.
 *
 * Fetched once and cached hard: it is the same ~150kB for every article, every
 * player, every round.
 */
const SHEETS = (language: string) => [
	'https://meta.wikimedia.org/api/rest_v1/data/css/mobile/base',
	`https://${language}.wikipedia.org/api/rest_v1/data/css/mobile/site`,
	'https://meta.wikimedia.org/api/rest_v1/data/css/mobile/pcs'
];

export const GET: RequestHandler = async ({ params, setHeaders }) => {
	if (!/^[a-z]{2,8}$/.test(params.lang)) throw error(400, 'Not a language.');
	const userAgent = env.WIKIPEDIA_USER_AGENT || DEFAULT_USER_AGENT;

	const sheets = await Promise.all(
		SHEETS(params.lang).map(async (url) => {
			const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
			return response.ok ? response.text() : '';
		})
	);
	if (sheets.every((sheet) => !sheet)) throw error(502, 'Could not fetch the stylesheets.');

	setHeaders({
		'Content-Type': 'text/css; charset=utf-8',
		'Cache-Control': 'public, max-age=86400, immutable'
	});
	return new Response(sheets.join('\n'));
};
