import { MAX_NAME_LENGTH } from './protocol';

const ADJECTIVES = [
	'Brazen',
	'Candid',
	'Crafty',
	'Dubious',
	'Earnest',
	'Fibbing',
	'Gilded',
	'Hasty',
	'Idle',
	'Jolly',
	'Keen',
	'Lofty',
	'Murky',
	'Nimble',
	'Odd',
	'Plucky',
	'Quiet',
	'Rash',
	'Shifty',
	'Tall',
	'Unruly',
	'Vague',
	'Wily',
	'Zealous'
];

const NOUNS = [
	'Badger',
	'Cardinal',
	'Ferret',
	'Gannet',
	'Heron',
	'Ibex',
	'Jackal',
	'Kestrel',
	'Lemur',
	'Marten',
	'Newt',
	'Otter',
	'Pelican',
	'Quail',
	'Raven',
	'Stoat',
	'Tapir',
	'Vole',
	'Walrus',
	'Yak'
];

/** A readable stand-in so nobody has to pick a name before they can play. */
export function randomName(): string {
	const [a, b] = crypto.getRandomValues(new Uint32Array(2));
	return `${ADJECTIVES[a % ADJECTIVES.length]} ${NOUNS[b % NOUNS.length]}`;
}

function isPrintable(character: string): boolean {
	const code = character.codePointAt(0) ?? 0;
	// Strip C0 controls and DEL. Tabs and newlines go too: a name is one line.
	return code > 0x1f && code !== 0x7f;
}

/**
 * Names are shown to other players, so drop control characters, collapse
 * whitespace, and cap the length. Returns null if nothing usable is left.
 */
export function cleanName(input: string): string | null {
	const name = Array.from(input).filter(isPrintable).join('').replace(/\s+/g, ' ').trim();
	if (!name) return null;
	return name.slice(0, MAX_NAME_LENGTH);
}
