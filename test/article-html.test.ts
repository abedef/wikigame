import { describe, expect, it } from 'vitest';
import { stripForReading } from '../src/lib/server/article-html';

describe('the in-game article copy', () => {
	it('takes the links out, which is the rule it exists to enforce', () => {
		const out = stripForReading('<p>See <a href="/wiki/Other" title="Other">Other</a> too.</p>');
		expect(out).not.toContain('href');
		expect(out).toContain('<a>');
		// The words survive; only the way out of the page goes.
		expect(out).toContain('Other');
	});

	it('drops scripts and stylesheets', () => {
		const out = stripForReading(
			'<link rel="stylesheet" href="x.css"><script>fetch("/steal")</script><style>a{}</style><p>Text</p>'
		);
		expect(out).not.toMatch(/<script|<style|<link/i);
		expect(out).toContain('<p>Text</p>');
	});

	it('drops media, which the activity cannot load anyway', () => {
		const out = stripForReading('<img src="//upload.wikimedia.org/a.png"><p>After</p>');
		expect(out).not.toContain('<img');
		expect(out).toContain('After');
	});

	it('leaves the prose and its structure alone', () => {
		const article = '<h2>History</h2><p>A village.</p><ul><li>One</li></ul>';
		expect(stripForReading(article)).toBe(article);
	});
});
