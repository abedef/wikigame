/**
 * A readable copy of a Wikipedia article, served from our own origin.
 *
 * Wikipedia will not be framed — mobile-html answers with
 * `x-frame-options: SAMEORIGIN` and `frame-ancestors 'self'` — but it does send
 * `access-control-allow-origin: *`, so we can fetch it and serve our own copy.
 *
 * That turns out to be what the game wants anyway. Rewriting the markup lets us
 * take the links out, so a reader gets the one article and cannot wander into
 * another one, by accident or otherwise. Their minute is spent on the thing
 * everybody else will be asked about.
 */

const MOBILE_HTML = (language: string, title: string) =>
	`https://${language}.wikipedia.org/api/rest_v1/page/mobile-html/${encodeURIComponent(title)}`;

/**
 * Rewrite Wikipedia's own markup so it can be served from here.
 *
 * The aim is the article as Wikipedia renders it — its stylesheet, its
 * infoboxes, its pictures — with two things taken away. Scripts go because the
 * page is served under a policy that forbids them and framed in a sandbox that
 * would not run them anyway. Links go because that is the rule the reader plays
 * under: they get this article and cannot wander into another.
 *
 * Everything else that travels does so through us, because an activity may only
 * load what comes from its own proxy domain.
 */
export function rewriteForReading(html: string, language: string): string {
	const asset = (raw: string) => {
		const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
		return absolute.startsWith('https://')
			? `/api/article-asset?u=${encodeURIComponent(absolute)}`
			: raw;
	};

	return (
		html
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
			.replace(/<script\b[^>]*\/?>/gi, '')
			// Their stylesheets, but fetched through us.
			.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, '')
			.replace(/<base\b[^>]*>/gi, '')
			.replace(
				/<\/head>/i,
				`<link rel="stylesheet" href="/api/article-style/${language}"><style>${OVERRIDES}</style></head>`
			)
			// Pictures, likewise. srcset carries several, each needing the same.
			.replace(/\bsrc="([^"]+)"/gi, (whole, url: string) =>
				/\.(png|jpe?g|gif|svg|webp)/i.test(url) ? `src="${asset(url)}"` : whole
			)
			.replace(/\bsrcset="([^"]+)"/gi, (_whole, set: string) => {
				const rewritten = set
					.split(',')
					.map((part) => {
						const [url, ...rest] = part.trim().split(/\s+/);
						return [asset(url), ...rest].join(' ');
					})
					.join(', ');
				return `srcset="${rewritten}"`;
			})
			// Wikipedia defers its images: what ships is a placeholder span carrying
			// the real URL in data-src, which their script swaps for an <img> once
			// it scrolls into view. No script runs here, so the swap is done now.
			.replace(
				/<span\b([^>]*pcs-lazy-load-placeholder[^>]*)>(?:\s*<span[^>]*><\/span>\s*)?<\/span>/gi,
				(whole, attributes: string) => {
					const value = (name: string) =>
						new RegExp(`data-${name}="([^"]*)"`, 'i').exec(attributes)?.[1];
					const src = value('src');
					if (!src) return whole;
					const parts = [`src="${src}"`];
					const srcset = value('srcset');
					if (srcset) parts.push(`srcset="${srcset}"`);
					for (const name of ['alt', 'width', 'height']) {
						const found = value(name);
						if (found) parts.push(`${name}="${found}"`);
					}
					return `<img class="mw-file-element" ${parts.join(' ')}>`;
				}
			)
			// The rule of the round: an anchor with no href is just text.
			.replace(/<a\b[^>]*>/gi, '<a>')
	);
}

/**
 * A short sheet on top of Wikipedia's own, for the handful of things that make
 * no sense in a game: the furniture that leads somewhere, and a reminder that
 * the words which look like links are not.
 */
const OVERRIDES = `
.pcs-edit-section-link, .pcs-edit-section-header, .mw-editsection, .navbox, .noprint { display: none !important }

/* Infoboxes arrive collapsed behind a "Quick facts" control that their script
   would open. Nothing is going to click it, and the table underneath is the
   most quotable thing on the page, so it starts open and the control goes. */
.pcs-collapse-table-content { display: block !important }
.pcs-collapse-table-collapsed-container, .pcs-collapse-table-collapse-text { display: none !important }
a { cursor: default !important; text-decoration: none !important; color: inherit !important }
body { -webkit-text-size-adjust: 100%; }
`;

export type ArticlePage = { html: string; status: number };

export async function readableArticle(
	title: string,
	language: string,
	userAgent: string
): Promise<ArticlePage> {
	const response = await fetch(MOBILE_HTML(language, title), {
		headers: { 'User-Agent': userAgent, Accept: 'text/html' }
	});
	if (!response.ok) {
		return { status: response.status === 404 ? 404 : 502, html: '' };
	}

	// Their document, kept whole and rewritten in place, rather than a new one
	// built around an extract of it: the structure is most of what makes an
	// article readable.
	return { status: 200, html: rewriteForReading(await response.text(), language) };
}
