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
		tagline: 'A social deduction game played with whatever Wikipedia throws at you.',
		// Says what you need before you can play, what you will be doing, and how
		// long it takes to learn, and lands the marker on the last of those, which
		// is the one worth doubting.
		needsBefore:
			"Grab two or more friends and a way to talk to each other. Your goal is to convince everyone you've read a random Wikipedia article you may never have heard of in your life, so I hope you've got a good poker face. You'll pick the game up in about a",
		needsLastWord: 'minute.',
		description:
			'A quick social deduction game played with random Wikipedia articles. Everyone reads one, only one of them comes up, and you all have to claim you read that one.',
		roomTitle: (code: string) => `Room ${code} — [citation needed]`,
		disclaimer:
			'Not affiliated with or endorsed by the Wikimedia Foundation. Wikipedia is a registered trademark of the Wikimedia Foundation.'
	},

	landing: {
		// Under the buttons, "You are X" is a non-sequitur; saying what the name is
		// for explains why it is on the page at all.
		youAre: "You'll join as",
		change: 'Change',
		yourName: 'Your name',
		save: 'Save',
		haveCode: 'Got a room code?',
		host: 'Host a new game',
		or: 'or',
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
				title: 'Everyone gets an article',
				body: "You'll each get a random Wikipedia article. Don't like yours? Redraw it. Go for something you reckon you could talk about."
			},
			{
				title: 'Everyone reads',
				body: 'You all get a minute alone with your own article. One of them is going to come up, but nobody knows which one yet, so read fast!'
			},
			{
				title: 'One article comes up',
				body: "If it's yours, great, you actually read it. If it isn't, you have to convince the guesser it was you anyway."
			}
		],
		kicker:
			'Get picked when you really did read it and you and the guesser both take 2 points. Get picked when you were bluffing and you take 3 on your own. Either way, whoever got picked is the next guesser.'
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
		help: 'Help',
		helpTitle: 'What am I meant to be doing?',
		helpNow: 'Right now',
		helpRules: 'The game',
		helpScoring: 'Points',
		helpClose: 'Got it',
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
		roundsHint: 'How many times the guesser changes.',
		redraws: 'Redraws',
		redrawsHint: 'How many articles each player can throw back.',
		readingTime: 'Reading time',
		readingTimeHint: 'How long everyone gets with their article.',
		summary: (rounds: number, redraws: number, seconds: number) =>
			`${rounds} rounds · ${redraws} redraws · ${seconds}s to read`,
		ready: "I'm ready",
		notReady: "I'm not ready",
		start: 'Start the game',
		// English's plural rule is trivial, but going through Intl.PluralRules is
		// the pattern a locale with more than two forms will need.
		waitingForPlayers: (n: number) =>
			plural.select(n) === 'one'
				? 'One more player and you can start.'
				: `${n} more players and you can start.`,
		waitingForReady: 'Waiting for everyone to be ready.',
		waitingForHost: 'Waiting for the host to start.'
	},

	picking: {
		guesserLead: "You're the guesser this round.",
		guesserBody:
			"Everyone else is picking an article. One of them will be the one you ask about, but they don't know which yet, so they all have to read theirs properly.",
		settled: (settled: number, total: number) =>
			settled === total
				? 'Everyone has picked. Here we go.'
				: plural.select(total - settled) === 'one'
					? 'One of them is still picking.'
					: `${total - settled} of them are still picking.`,
		lockedIn: 'Locked in!',
		waitingOthers: (settled: number, total: number) =>
			settled === total
				? 'Everyone has picked. Here we go.'
				: `${settled} of ${total} have picked. Hang on.`,
		hint: "Pick something you could talk about for a minute. You'll get to read it properly in a second, and it might be the one everyone gets quizzed on.",
		redraw: (left: number) => `Redraw (${left} left)`,
		noRedraws: 'No redraws left',
		lockThisIn: 'Lock this in',
		drawing: 'Getting you an article…'
	},

	reading: {
		label: 'Reading',
		secondsLeft: (seconds: number) => `${seconds}s`,
		yoursLead: "Here's your article. Read it!",
		yoursBody:
			"This might be the one everyone gets asked about. You won't know until the questions start, so make it count.",
		openFull: 'Open the full article',
		doneReading: "I'm done reading",
		waitingOthers: (stillReading: number) =>
			stillReading === 0
				? 'Waiting for the others.'
				: plural.select(stillReading) === 'one'
					? 'Nice. Waiting on one more.'
					: `Nice. Waiting on ${stillReading} more.`,
		guesserLead: 'Sit tight.',
		guesserBody:
			"Everyone else is reading their own article. In a moment one of them comes up, and that's the one you get to ask about."
	},

	questioning: {
		guesserLead: 'Ask them anything you like.',
		guesserBody:
			'Only one of them actually read this article. The rest read something completely different. Ask around until you think you know who really read it, then pick them.',
		answerLead: 'Time to answer.',
		readerBody:
			'Lucky you, this is the one you read! Convince the guesser it was you and you both score. Careful though, everyone else is listening and will happily repeat whatever you say.',
		blufferBody:
			'You read a completely different article. Bad luck! Convince the guesser it was you who read this one anyway. Fool them and you get the points.',
		waitingFor: (name: string) => `${name} is deciding.`
	},

	reveal: {
		found: (guesser: string) => `${guesser} got it!`,
		missed: (named: string, reader: string) =>
			`${named} had them fooled. ${reader} was the one who actually read it.`,
		foundBody: (reader: string) => `${reader} really did read it, and they both score.`,
		missedBody: (named: string) => `${named} never read it and got away with it. Points to them!`,
		nextRound: (round: number) => `Start round ${round}`,
		seeFinalScores: 'See the final scores',
		takesChair: (name: string) => `${name} is the guesser next.`,
		waitingForHost: (name: string) => `${name} is the guesser next. Waiting for the host.`
	},

	scoring: [
		'The guesser picks the person who really read it: they both get 2 points.',
		'The guesser picks someone who was bluffing: that bluffer gets 3 points.',
		'Whoever got picked is the guesser for the next round.'
	],

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
		lockedIn: 'Locked in',
		reading: 'Reading',
		doneReading: 'Done'
	},

	errors
};

/** Every other locale is checked against the shape of English. */
export type Messages = typeof en;
