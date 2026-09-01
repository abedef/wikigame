/**
 * The wire contract between the browser and the Room durable object.
 *
 * Both sides import this file, so a change here is a change to both ends at once.
 * Every message is JSON with a `type` discriminant.
 *
 * The split between RoomState and PrivateState is the game's secrecy boundary.
 * RoomState is identical for everyone in the room. PrivateState is built per
 * socket, and it is the only place a player's own candidate article, and the
 * reader's copy of the article text, ever appear.
 */

/**
 * A round runs picking -> reading -> questioning -> reveal, then either loops
 * back to picking or ends the game.
 */
export type Stage =
	/** Waiting for players; the host can change settings and start. */
	| 'lobby'
	/** Every guessee is drawing random articles and locking one in. */
	| 'picking'
	/** One locked-in article has been drawn. Only its owner can read it. */
	| 'reading'
	/** The guesser interrogates the table and then names a reader. */
	| 'questioning'
	/** The reader is revealed and points are awarded. */
	| 'reveal'
	/** Every round has been played. */
	| 'finished';

/** What everyone may know about an article: enough to judge it, not to fake it. */
export type ArticleCard = {
	title: string;
	/** Wikipedia's one-line description, e.g. "village in Bulgaria". */
	description: string;
};

/** The article itself. Only the reader sees this, and only while reading. */
export type Article = ArticleCard & {
	extract: string;
	url: string;
	thumbnail: string | null;
};

export type PublicPlayer = {
	id: string;
	name: string;
	score: number;
	/** False while the player has no live socket, e.g. they closed the tab. */
	connected: boolean;
	/** The player who may change settings, start, and abandon a stuck round. */
	isHost: boolean;
	/** Lobby only: has this player said they are ready. */
	ready: boolean;
	/** Picking only: has this player settled on an article. */
	lockedIn: boolean;
	/** Reading only: has this player finished with their own article. */
	doneReading: boolean;
};

export type RoomSettings = {
	/** How many rounds before the game ends. */
	rounds: number;
	/** How many times a player may redraw their article in a round. */
	rerolls: number;
	/** How long the reader gets alone with the article. */
	readingSeconds: number;
};

export const DEFAULT_SETTINGS: RoomSettings = {
	rounds: 5,
	// Special:Random is mostly stubs, so a player needs real room to draw away
	// from something they could not say a word about.
	rerolls: 8,
	readingSeconds: 60
};

export const SETTING_LIMITS = {
	rounds: { min: 1, max: 20 },
	rerolls: { min: 0, max: 30 },
	readingSeconds: { min: 15, max: 180 }
} as const;

/** Identical for every player in the room. Nothing secret may go in here. */
export type RoomState = {
	code: string;
	stage: Stage;
	players: PublicPlayer[];
	/** 0 in the lobby, then 1-based. */
	round: number;
	settings: RoomSettings;
	/** Who is questioning this round. */
	guesserId: string | null;
	/** The round's article, known to everyone from the reading stage onwards. */
	article: ArticleCard | null;
	/** Milliseconds left of the reading stage when this state was sent. */
	readingMsLeft: number | null;
	/** Who actually read it. Null until the reveal, or the secret would be out. */
	readerId: string | null;
	/** The full article text, published to everyone once the round is over. */
	revealedArticle: Article | null;
	/** Who the guesser named. */
	guessId: string | null;
	/** Points awarded by the round being revealed, by player id. */
	awards: Record<string, number> | null;
};

/** Built separately for each socket. */
export type PrivateState = {
	/** The article you are currently looking at while picking. */
	candidate: ArticleCard | null;
	rerollsLeft: number;
	lockedIn: boolean;
	/**
	 * Your own article, in full, while reading. Everybody reads their own and
	 * nobody is told whether theirs is the one that will be asked about, so the
	 * room has no idle players for the guesser to spot.
	 */
	reading: Article | null;
	/** Reading only: have you finished with your own article. */
	doneReading: boolean;
	/**
	 * Whether the article being asked about is the one you read. Told only to
	 * you, and not until the questioning starts — during the reading nobody
	 * knows, which is what keeps everyone reading.
	 */
	isReader: boolean;
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_NAME_LENGTH = 20;

/**
 * Scoring. The reader wants to be found: they and the guesser score together,
 * so the reader has to convey real knowledge without handing the bluffers a
 * script. A bluffer scores by being mistaken for the reader, and scores more
 * because only one of them can manage it while a correct guess pays two people.
 */
export const SCORING = {
	/** To the guesser, for naming the reader. */
	guesserCorrect: 2,
	/** To the reader, for being recognised. */
	readerFound: 2,
	/** To a bluffer who was named instead of the reader. */
	bluffSucceeded: 3
} as const;

export type ErrorCode =
	| 'bad-token'
	| 'room-full'
	| 'game-in-progress'
	| 'not-host'
	| 'not-guesser'
	| 'not-enough-players'
	| 'not-everyone-ready'
	| 'no-rerolls-left'
	| 'wikipedia-unavailable'
	| 'bad-request'
	| 'server-error';

/** Browser to durable object. */
export type ClientMessage =
	| { type: 'set-name'; name: string }
	| { type: 'set-ready'; ready: boolean }
	| { type: 'set-settings'; settings: Partial<RoomSettings> }
	| { type: 'start' }
	/** Draw a different article. Picking stage, guessees only. */
	| { type: 'reroll' }
	/** Settle on the article currently drawn. */
	| { type: 'lock-in' }
	/** The reader has taken it in and does not want the rest of the clock. */
	| { type: 'done-reading' }
	/** The guesser names who they think read it. */
	| { type: 'guess'; playerId: string }
	/** Move on from the reveal. */
	| { type: 'next-round' }
	/** Host escape hatch for a round that cannot finish. */
	| { type: 'abort-round' }
	/** Back to the lobby from a finished game, scores cleared. */
	| { type: 'play-again' }
	| { type: 'ping' };

/** Durable object to browser. */
export type ServerMessage =
	| { type: 'state'; state: RoomState; you: string; private: PrivateState }
	| { type: 'error'; code: ErrorCode; message: string }
	| { type: 'pong' };
