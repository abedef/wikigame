/**
 * English, and the shape every other locale is checked against.
 *
 * Anything a player reads lives here, so phrasing can be changed in one place
 * without going near a component. Values that vary are functions rather than
 * templates with placeholders: a translator needs to reorder the sentence, not
 * just fill in its blanks, and a function lets them.
 */

import type { ErrorCode } from '../protocol';

const plural = new Intl.PluralRules('en');
const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

const players = (n: number) => (plural.select(n) === 'one' ? 'player' : 'players');

/**
 * Keyed by the ErrorCode the game server sends. The server also sends English
 * prose alongside the code; this is what gets shown, so that text is only ever
 * a fallback for a code added here later than it was sent.
 */
const errors: Record<ErrorCode, string> = {
	'bad-token': 'That sign-in is not valid. Reload the page.',
	'room-full': 'That room is full.',
	'game-in-progress': 'That game has already started.',
	'not-host': 'Only the host can do that.',
	'not-guesser': 'Only the guesser names a reader.',
	'not-enough-players': 'Everyone has to be ready first.',
	'no-rerolls-left': 'You have used all your redraws.',
	'wikipedia-unavailable': 'Wikipedia is not answering. Try again in a moment.',
	'bad-request': 'That did not make sense to the game server.',
	'server-error': 'Something went wrong on the game server.'
};

export const en = {
	/** The name is a proper noun and deliberately not translated. */
	brand: '[citation needed]',

	meta: {
		tagline: 'The free bluffing game that anyone can play.',
		description:
			'A bluffing game played with Wikipedia articles. Everyone claims they read it; one of them did.',
		roomTitle: (code: string) => `Room ${code} — [citation needed]`,
		disclaimer:
			'Not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a registered trademark of the Wikimedia Foundation.'
	},

	landing: {
		pitchBefore: 'Everyone at the table claims they read the article. One of them actually',
		pitchLastWord: 'did.',
		youAre: 'You are',
		change: 'Change',
		yourName: 'Your name',
		save: 'Save',
		host: 'Host a new game',
		orJoin: 'or join one',
		roomCode: 'Room code',
		join: 'Join',
		nameTooShort: 'Names need at least one character.',
		badCode: 'Room codes are four letters and numbers.',
		serverSilent: 'The game server is not answering. Try again in a moment.'
	},

	room: {
		label: 'Room',
		withCode: (code: string) => `Room ${code}`,
		roundOf: (round: number, total: number) => `Round ${round} of ${total}`,
		cantJoin: (code: string) => `Can't join room ${code}`,
		connectingTo: (code: string) => `Connecting to room ${code}…`,
		back: 'Back to the start',
		reconnecting: 'Connection lost — reconnecting…',
		connecting: 'Connecting…',
		copyInvite: '[copy invite link]',
		inviteCopied: '[link copied]',
		abandon: 'Abandon this round and deal again',
		stage: {
			lobby: 'Lobby',
			picking: 'Choosing articles',
			reading: 'Reading',
			questioning: 'Questioning',
			reveal: 'Reveal',
			finished: 'Final scores'
		}
	},

	lobby: {
		changeName: 'Change your name',
		rounds: 'Rounds',
		roundsHint: 'How many times the chair changes hands.',
		redraws: 'Redraws',
		redrawsHint: 'Redraws each player gets per round.',
		readingTime: 'Reading time',
		readingTimeHint: 'Seconds the reader gets alone with it.',
		summary: (rounds: number, redraws: number, seconds: number) =>
			`${rounds} rounds · ${redraws} redraws · ${seconds}s to read`,
		ready: "I'm ready",
		notReady: "I'm not ready",
		start: 'Start the game',
		waitingForPlayers: (n: number) => `Waiting for ${n} more ${players(n)}.`,
		waitingForReady: 'Waiting for everyone to be ready.',
		waitingForHost: 'Waiting for the host to start.'
	},

	picking: {
		guesserLead: 'You are the guesser this round.',
		guesserBody:
			'Everyone else is drawing a random article. One of theirs will be chosen, and only that person gets to read it — your job is to work out who.',
		settled: (settled: number, total: number) =>
			`${settled} of ${total} have settled on an article.`,
		lockedIn: 'Locked in.',
		waitingOthers: (settled: number, total: number) =>
			`Waiting for the others. ${settled} of ${total} have chosen.`,
		hint: 'If this one is drawn, you will be the only person who reads it — and you will be trying to convince the guesser that you did. Redraw until you get something you could talk about.',
		redraw: (left: number) => `Redraw (${left} left)`,
		noRedraws: 'No redraws left',
		lockThisIn: 'Lock this in',
		drawing: 'Drawing an article for you…'
	},

	reading: {
		label: 'Reading',
		secondsLeft: (seconds: number) => `${seconds}s`,
		yoursLead: 'This one is yours. You are the reader.',
		yoursBody:
			'You want to be found: the guesser scores with you. Take in enough to prove you were really here — but remember everyone else can hear your answers and will copy them.',
		openFull: 'Open the full article',
		doneReading: "I've read enough — start the questions",
		guesserBody: 'One of the others is reading this right now. Everyone will claim they did.',
		blufferBody:
			'Someone else drew this and is reading it now. You will have to pretend it was you, so think about anything you already know on the subject.'
	},

	questioning: {
		guesserLead: 'Question the table, then name the reader.',
		guesserBody:
			'The reader is on your side — they score when you find them. Everyone else is trying to sound exactly like them. Take as long as you like; choose when you are ready.',
		answerLead: 'Answer the questions.',
		readerBody: 'Convince them it was you.',
		blufferBody:
			'You never saw it. Convince them you did anyway — being named is worth more to you than being believed by anyone else.',
		waitingFor: (name: string) => `Waiting for ${name} to decide.`
	},

	reveal: {
		found: (guesser: string) => `${guesser} found the reader.`,
		missed: (named: string, reader: string) => `${named} was named — but ${reader} was the reader.`,
		foundBody: (reader: string) => `${reader} got the article across, and they both score for it.`,
		missedBody: (named: string) => `${named} bluffed their way past the real thing.`,
		nextRound: (round: number) => `Start round ${round}`,
		seeFinalScores: 'See the final scores',
		takesChair: (name: string) => `${name} takes the chair next.`,
		waitingForHost: (name: string) => `${name} is the next guesser. Waiting for the host.`
	},

	finished: {
		wins: (name: string) => `${name} wins`,
		tie: (names: string[]) => `${list.format(names)} tie`,
		playAgain: 'Play again'
	},

	players: {
		heading: (n: number) => `Players (${n})`,
		away: (n: number) => `${n} away`,
		you: '(you)',
		guesser: '[guesser]',
		reader: '[reader]',
		host: '[host]',
		disconnected: 'away',
		ready: 'Ready',
		notReady: 'Not ready',
		choosing: 'Choosing',
		lockedIn: 'Locked in'
	},

	errors
};

/** Every other locale is checked against the shape of English. */
export type Messages = typeof en;
