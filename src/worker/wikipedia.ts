import type { Article } from '../lib/protocol';

const RANDOM_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/random/summary';

/**
 * Wikimedia asks that API clients identify themselves and give a way to be
 * contacted about misbehaving traffic. Override WIKIPEDIA_USER_AGENT with
 * something that points at your own deployment before running this in public.
 * https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
 */
const DEFAULT_USER_AGENT = 'LieToMe/0.1 (party game; https://github.com/; contact via repository)';

/**
 * Articles shorter than this have nothing in them to read, remember, or bluff
 * about, so a round built on one is a dead round.
 */
const MIN_EXTRACT_LENGTH = 160;
const ATTEMPTS = 6;

type SummaryResponse = {
	type?: string;
	title?: string;
	description?: string;
	extract?: string;
	content_urls?: { desktop?: { page?: string } };
	thumbnail?: { source?: string };
};

/**
 * Draw a random article.
 *
 * The draw is genuinely random, as the game intends: this does not steer
 * towards well-known subjects. It only rejects pages that cannot be played at
 * all — disambiguation pages, list pages, and stubs with no prose — and lets
 * the players' rerolls do the rest.
 */
export async function randomArticle(userAgent = DEFAULT_USER_AGENT): Promise<Article> {
	let lastError: unknown = null;

	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		try {
			const response = await fetch(RANDOM_SUMMARY, {
				headers: { 'User-Agent': userAgent, Accept: 'application/json' },
				// The random endpoint answers with a redirect to the drawn article, and
				// every draw must be a fresh one.
				redirect: 'follow',
				cf: { cacheTtl: 0, cacheEverything: false }
			});
			if (!response.ok) {
				lastError = new Error(`wikipedia responded ${response.status}`);
				continue;
			}

			const summary = (await response.json()) as SummaryResponse;
			if (!isPlayable(summary)) continue;

			return {
				title: summary.title!,
				description: summary.description ?? '',
				extract: summary.extract!,
				url:
					summary.content_urls?.desktop?.page ??
					`https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title!)}`,
				thumbnail: summary.thumbnail?.source ?? null
			};
		} catch (error) {
			lastError = error;
		}
	}

	throw new Error(`could not draw an article from Wikipedia: ${lastError}`);
}

function isPlayable(summary: SummaryResponse): boolean {
	if (summary.type !== 'standard') return false;
	if (!summary.title || !summary.extract) return false;
	if (summary.extract.length < MIN_EXTRACT_LENGTH) return false;
	// List and index pages read as inventories rather than as anything a person
	// could claim to have taken in and remembered.
	if (/^(List|Index|Outline|Timeline) of /i.test(summary.title)) return false;
	return true;
}

/** Draw several at once, for the start of a picking stage. */
export async function randomArticles(count: number, userAgent?: string): Promise<Article[]> {
	return Promise.all(Array.from({ length: count }, () => randomArticle(userAgent)));
}
