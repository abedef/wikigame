import { describe, expect, it } from 'vitest';
import { cleanName, randomName } from '../src/lib/names';
import { MAX_NAME_LENGTH } from '../src/lib/protocol';

/** Built from char codes so this file stays plain ASCII. */
const ESCAPE = String.fromCharCode(27);
const NEWLINE = String.fromCharCode(10);
const E_ACUTE = String.fromCharCode(233);

describe('names', () => {
	it('generates something readable', () => {
		expect(randomName()).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
	});

	it('keeps ordinary names as they are', () => {
		expect(cleanName('Ada')).toBe('Ada');
		expect(cleanName('Jean-Luc')).toBe('Jean-Luc');
		expect(cleanName(`Jos${E_ACUTE}`)).toBe(`Jos${E_ACUTE}`);
	});

	it('tidies whitespace', () => {
		expect(cleanName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
	});

	it('strips control characters that would break the layout', () => {
		// A terminal escape sequence, or a newline smuggled into a player list.
		expect(cleanName(`Ada${ESCAPE}[31m`)).toBe('Ada[31m');
		expect(cleanName(`one${NEWLINE}two`)).toBe('onetwo');
	});

	it('caps the length', () => {
		expect(cleanName('x'.repeat(200))).toHaveLength(MAX_NAME_LENGTH);
	});

	it('rejects names with nothing in them', () => {
		expect(cleanName('')).toBeNull();
		expect(cleanName('   ')).toBeNull();
		expect(cleanName(ESCAPE)).toBeNull();
	});
});
