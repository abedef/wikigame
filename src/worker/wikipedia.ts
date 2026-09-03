import type { Article } from '../lib/protocol';

/**
 * Which Wikipedia to draw from.
 *
 * This is the half of localisation that decides what the game actually is: the
 * round is reading an article and describing it, so a table playing in French
 * needs fr.wikipedia.org, not a French interface wrapped around English prose.
 * Every language edition exposes the same REST API, so the language code is the
 * only thing that changes.
 *
 * It is a property of the room rather than of a player — everyone at a table has
 * to be shown the same article — so it is threaded through from the caller.
 */
export const DEFAULT_ARTICLE_LANGUAGE = 'en';

/**
 * Overridable so the browser suite can point at a stub. A gate that reaches
 * Wikipedia for every round fails on their latency rather than on our bugs,
 * and asks them for a lot of random articles to prove nothing about them.
 */
const randomSummaryUrl = (language: string, origin?: string) =>
	`${origin ?? `https://${language}.wikipedia.org`}/api/rest_v1/page/random/summary`;

/**
 * Wikimedia asks that API clients identify themselves and give a way to be
 * contacted about misbehaving traffic; the repository's issues are that route.
 * If you run your own deployment, set WIKIPEDIA_USER_AGENT to point at yours
 * instead, so traffic from it does not come back to this one.
 * https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
 */
const DEFAULT_USER_AGENT = 'CitationNeeded/0.1 (https://github.com/abedef/wikigame)';

/**
 * Articles shorter than this have nothing in them to read, remember, or bluff
 * about, so a round built on one is a dead round.
 */
const MIN_EXTRACT_LENGTH = 160;
const ATTEMPTS = 6;

type SummaryResponse = {
	type?: string;
	title?: string;
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
export async function randomArticle(
	userAgent = DEFAULT_USER_AGENT,
	language = DEFAULT_ARTICLE_LANGUAGE,
	origin?: string
): Promise<Article> {
	let lastError: unknown = null;

	for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
		try {
			const response = await fetch(randomSummaryUrl(language, origin), {
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
export async function randomArticles(
	count: number,
	userAgent?: string,
	language = DEFAULT_ARTICLE_LANGUAGE,
	origin?: string
): Promise<Article[]> {
	return Promise.all(
		Array.from({ length: count }, () => randomArticle(userAgent, language, origin))
	);
}
