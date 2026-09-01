/**
 * Where a request should be sent, if it did not arrive on the canonical host.
 *
 * A player is a cookie, and a cookie set on one hostname is not sent to
 * another, so two live hostnames would hand the same person two identities and
 * let a single room hold both. Spare domains therefore redirect rather than
 * serve, which also means they follow: point the canonical host somewhere else
 * and everything aimed at it arrives there too, with no further deploy.
 *
 * Returns null when the request should be served as it is.
 */
export function canonicalRedirect(requestUrl: string, canonicalHost?: string): string | null {
	if (!canonicalHost) return null;

	const url = new URL(requestUrl);
	// Development is served on a bare host and must not be bounced anywhere.
	if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null;
	if (url.hostname === canonicalHost) return null;

	url.hostname = canonicalHost;
	// Path and query come along, so a room link shared on a spare domain still
	// lands in that room.
	return url.toString();
}
