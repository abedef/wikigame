import { describe, expect, it } from 'vitest';
import { rewriteForReading } from '../src/lib/server/article-html';

const wrap = (body: string) => `<html><head></head><body>${body}</body></html>`;

describe('the in-game copy of an article', () => {
	it('takes the links out, which is the rule it exists to enforce', () => {
		const out = rewriteForReading(wrap('<p>See <a href="/wiki/Other">Other</a> too.</p>'), 'en');
		expect(out).not.toContain('href="/wiki/Other"');
		expect(out).toContain('<a>');
		// The words survive; only the way out of the page goes.
		expect(out).toContain('Other');
	});

	it('drops scripts, which the policy would refuse to run in any case', () => {
		const out = rewriteForReading(wrap('<script>fetch("/steal")</script><p>Text</p>'), 'en');
		expect(out).not.toMatch(/<script/i);
		expect(out).toContain('<p>Text</p>');
	});

	it("serves Wikipedia's own stylesheet through us rather than dropping it", () => {
		const out = rewriteForReading(
			'<html><head><link rel="stylesheet" href="//meta.wikimedia.org/api/rest_v1/data/css/mobile/base"></head><body></body></html>',
			'fr'
		);
		expect(out).not.toContain('meta.wikimedia.org/api/rest_v1/data/css');
		// The activity may only load what comes from its own proxy domain.
		expect(out).toContain('/api/article-style/fr');
	});

	it('routes pictures through us instead of throwing them away', () => {
		const out = rewriteForReading(
			wrap('<img src="//upload.wikimedia.org/wikipedia/commons/a/ab/Example.jpg">'),
			'en'
		);
		expect(out).toContain('/api/article-asset?u=');
		expect(out).toContain(encodeURIComponent('https://upload.wikimedia.org'));
		// An article about a place is much less use without its pictures.
		expect(out).toContain('<img');
	});

	it('rewrites every candidate in a srcset, not just the first', () => {
		const out = rewriteForReading(
			wrap('<img srcset="//upload.wikimedia.org/a.png 1x, //upload.wikimedia.org/b.png 2x">'),
			'en'
		);
		expect(out.match(/\/api\/article-asset/g)).toHaveLength(2);
		expect(out).toContain('1x');
		expect(out).toContain('2x');
	});

	it('leaves the prose and its structure alone', () => {
		const article =
			'<h2>History</h2><p>A village.</p><table class="infobox"><tr><td>1938</td></tr></table>';
		expect(rewriteForReading(wrap(article), 'en')).toContain(article);
	});
});
