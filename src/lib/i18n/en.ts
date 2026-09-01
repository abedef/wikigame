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
		tagline:
			"In a minute you'll be talking about an article you never opened. Try to sound like you did.",
		description:
			'You will be asked about a Wikipedia article you never opened. So will everyone else at the table. One of them is telling the truth.',
		roomTitle: (code: string) => `Room ${code} — [citation needed]`,
		disclaimer:
			'Not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a registered trademark of the Wikimedia Foundation.'
	},

	landing: {
		// Ends on a claim worth doubting, so the marker lands on something that
		// has earned it rather than being decoration.
		pitchBefore: 'One of you will actually have read it. The difference will be',
		pitchLastWord: 'obvious.',
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

	howItWorks: {
		heading: 'How does it work?',
		steps: [
			{
				title: 'You all draw an article',
				body: 'Everyone except the guesser gets a random Wikipedia article. Redraw until you get one you could talk your way through.'
			},
			{
				title: 'One of you gets to read it',
				body: 'A single article is drawn from the pile. Only the person who picked it sees the text. Everyone else gets the title and nothing else.'
			},
			{
				title: 'The guesser works out who',
				body: 'They can ask the table anything. You will all insist you read it. Then they name the one they believe.'
			}
		],
		kicker:
			'The catch: the reader wants to be caught. They score with the guesser, so they are trying to be convincing — while everyone else is trying to sound exactly like them.'
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
		redrawsHint: 'How many articles each player can throw back.',
		readingTime: 'Reading time',
		readingTimeHint: 'How long the reader gets alone with it.',
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
		guesserLead: 'You sit this part out.',
		guesserBody:
			'The others are picking articles they think they can fake. One of them will actually get to read theirs. The rest will lie to your face about it.',
		settled: (settled: number, total: number) =>
			settled === total
				? 'Everyone has something. Any moment now.'
				: total - settled === 1
					? 'One of them is still shopping for something they can talk about.'
					: `${total - settled} of them are still shopping for something they can talk about.`,
		lockedIn: "That's the one.",
		waitingOthers: (settled: number, total: number) =>
			settled === total
				? 'Everyone has settled. Any moment now.'
				: `${settled} of ${total} have settled. Waiting on the rest.`,
		hint: 'If this one comes up you are the only person who gets to read it, and the only one who will be telling the truth. Redraw until you find something you could talk about for a minute without help.',
		redraw: (left: number) => `Redraw (${left} left)`,
		noRedraws: 'No redraws left',
		lockThisIn: 'Lock this in',
		drawing: 'Finding you something…'
	},

	reading: {
		label: 'Reading',
		secondsLeft: (seconds: number) => `${seconds}s`,
		yoursLead: 'This one is yours. Nobody else gets to see it.',
		yoursBody:
			'You want to be caught: you score when the guesser finds you. So give them something real — and remember the others are listening to every word and will hand it straight back to you as their own.',
		openFull: 'Open the full article',
		doneReading: "I've read enough — start the questions",
		guesserBody:
			'Someone at the table is reading this right now. Shortly they will all say they were.',
		blufferBody:
			'Someone else got this one. You get the title and whatever you can build out of it, so start now — you will be asked about it as though you had read it.'
	},

	questioning: {
		guesserLead: 'Ask them anything. Then name the one who read it.',
		guesserBody:
			'The reader wants to be found — they score when you get it right. Everyone else is doing an impression of them. Take as long as you like.',
		answerLead: 'Answer as though you read it.',
		readerBody: 'You did read it. Make that obvious without handing the others your material.',
		blufferBody:
			'You never saw it. Convince them you did anyway — being named is worth more to you than being believed by anyone else.',
		waitingFor: (name: string) => `${name} is deciding.`
	},

	reveal: {
		found: (guesser: string) => `${guesser} got it.`,
		missed: (named: string, reader: string) => `${named} sold it. ${reader} actually read it.`,
		foundBody: (reader: string) => `${reader} made it obvious enough. They both score.`,
		missedBody: (named: string) => `${named} out-read the person who actually read it.`,
		nextRound: (round: number) => `Start round ${round}`,
		seeFinalScores: 'See the final scores',
		takesChair: (name: string) => `${name} takes the chair next.`,
		waitingForHost: (name: string) => `${name} has the chair next. Waiting for the host.`
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
