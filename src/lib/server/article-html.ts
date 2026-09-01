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
 * Cosmetic, not the security boundary. The document is served with a CSP that
 * allows no scripts and no navigation, and framed with a `sandbox` that grants
 * neither, so a miss here is untidy rather than dangerous.
 */
export function stripForReading(html: string): string {
	return (
		html
			// Their scripts and stylesheets: we supply our own look, and the CSP
			// would refuse to run the scripts in any case.
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
			.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
			.replace(/<link\b[^>]*>/gi, '')
			.replace(/<base\b[^>]*>/gi, '')
			// Images and media come from upload.wikimedia.org, which the activity's
			// content policy will not load. Dropping them beats a page of broken
			// frames; see the note in #4 about proxying them properly.
			.replace(/<img\b[^>]*>/gi, '')
			.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, '')
			.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '')
			.replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi, '')
			.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
			// The point of the exercise: an anchor with no href is just text.
			.replace(/<a\b[^>]*>/gi, '<a>')
			// Wikipedia's own furniture, which is noise without its stylesheet.
			.replace(/<section\b[^>]*class="[^"]*pcs-edit[^"]*"[^>]*>[\s\S]*?<\/section>/gi, '')
			.replace(/<span\b[^>]*class="[^"]*pcs-edit-section-link[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
	);
}

/** Our own styling, so the article reads like the rest of the game. */
const STYLE = `
:root { color-scheme: light dark; --ink:#202122; --muted:#54595d; --line:#c8ccd1; --bg:#fff; }
@media (prefers-color-scheme: dark) {
	:root { --ink:#f8f9fa; --muted:#a2a9b1; --line:#3c4145; --bg:#1b1e21; }
}
html { background: var(--bg); }
body {
	margin: 0; padding: 1rem 1.1rem 2rem;
	background: var(--bg); color: var(--ink);
	font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	overflow-wrap: break-word;
}
h1, h2, h3, h4 {
	font-family: "Linux Libertine", Georgia, "Times New Roman", Times, serif;
	font-weight: 400; line-height: 1.25; margin: 1.4em 0 .4em;
}
h1 { font-size: 1.7rem } h2 { font-size: 1.35rem; border-bottom: 1px solid var(--line); padding-bottom: .2em }
h3 { font-size: 1.1rem } p { margin: 0 0 .9em }
/* Anchors kept their tags but lost their targets; make that visible. */
a { color: inherit; text-decoration: none }
table { display: block; overflow-x: auto; max-width: 100%; border-collapse: collapse; font-size: .9em }
td, th { border: 1px solid var(--line); padding: .3em .5em; text-align: left }
figure, .infobox, .navbox, .hatnote, .thumb, .mw-editsection, .reference, .noprint { display: none }
sup { display: none }
ul, ol { padding-left: 1.2em }
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

	const body = stripForReading(await response.text());
	// Rebuilt rather than patched, so nothing of theirs survives into the head.
	const html = `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<&]/g, '')}</title>
<style>${STYLE}</style>
</head>
<body>${body.replace(/^[\s\S]*?<body[^>]*>/i, '').replace(/<\/body>[\s\S]*$/i, '')}</body>
</html>`;
	return { status: 200, html };
}
