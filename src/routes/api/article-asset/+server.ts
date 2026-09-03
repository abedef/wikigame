import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_USER_AGENT = 'CitationNeeded/0.1 (https://github.com/abedef/wikigame)';

/**
 * Images for the article view, fetched through us.
 *
 * They live on Wikimedia's upload hosts, which the activity is not allowed to
 * load directly, and an article about a place or a person is much less use to
 * somebody who has to describe it if the pictures are missing.
 *
 * The allowlist is the whole security story: this endpoint must never become a
 * way to make our worker fetch an arbitrary URL on someone's behalf.
 */
const ALLOWED_HOSTS = new Set([
	'upload.wikimedia.org',
	'meta.wikimedia.org',
	'commons.wikimedia.org'
]);

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	const target = url.searchParams.get('u');
	if (!target) throw error(400, 'No asset.');

	let asset: URL;
	try {
		asset = new URL(target);
	} catch {
		throw error(400, 'Not a URL.');
	}
	if (asset.protocol !== 'https:' || !ALLOWED_HOSTS.has(asset.hostname)) {
		throw error(403, 'Not an allowed asset host.');
	}

	const response = await fetch(asset, {
		headers: { 'User-Agent': env.WIKIPEDIA_USER_AGENT || DEFAULT_USER_AGENT }
	});
	if (!response.ok) throw error(response.status === 404 ? 404 : 502, 'Could not fetch that.');

	const type = response.headers.get('content-type') ?? '';
	// Only ever hand back a picture, whatever the upstream decides to send.
	if (!type.startsWith('image/')) throw error(415, 'Not an image.');

	setHeaders({
		'Content-Type': type,
		'Cache-Control': 'public, max-age=86400, immutable'
	});
	return new Response(response.body);
};
