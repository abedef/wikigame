/**
 * Stands in for Wikipedia's random-summary endpoint while the browser suite
 * runs. Serves the same shape the real one does, so `isPlayable` and the
 * article card exercise their real code paths, but deterministically and
 * without asking Wikimedia for hundreds of random articles to prove nothing
 * about them.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT ?? 8788);

const SUBJECTS = [
	['Aardvark bothering', 'A pastime of the 1890s'],
	['The Bexley Incline', 'A funicular railway in Kent'],
	['Corvid parliament', 'A folkloric gathering of crows'],
	['Dunmow Flitch Trials', 'A custom of awarding bacon'],
	['Electric Telegraph Company', 'A Victorian communications firm'],
	['Fenwick Weavers Society', 'An early co-operative']
];

let n = 0;
const server = createServer((request, response) => {
	if (!request.url?.includes('/page/random/summary')) {
		response.writeHead(404).end();
		return;
	}
	const [title, description] = SUBJECTS[n % SUBJECTS.length];
	const unique = `${title} ${++n}`;
	// Comfortably past MIN_EXTRACT_LENGTH so every draw is playable and the
	// deal never has to retry.
	const extract =
		`${unique} is the subject of this article. ` +
		'It is described at sufficient length that the reader has something to remember and ' +
		'the bluffers have something to invent around, which is the whole point of the round. ' +
		'It was first recorded in the nineteenth century and is now largely forgotten.';

	response.writeHead(200, { 'Content-Type': 'application/json' });
	response.end(
		JSON.stringify({
			type: 'standard',
			title: unique,
			description,
			extract,
			content_urls: {
				desktop: { page: `https://example.invalid/wiki/${encodeURIComponent(unique)}` }
			}
		})
	);
});

server.listen(PORT, () => console.log(`wikipedia stub listening on ${PORT}`));
