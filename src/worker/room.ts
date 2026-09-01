import { DurableObject } from 'cloudflare:workers';
import { cleanName, randomName } from '../lib/names';
import {
	DEFAULT_SETTINGS,
	MAX_PLAYERS,
	MIN_PLAYERS,
	SCORING,
	SETTING_LIMITS,
	type Article,
	type ClientMessage,
	type ErrorCode,
	type PrivateState,
	type PublicPlayer,
	type RoomSettings,
	type RoomState,
	type ServerMessage,
	type Stage
} from '../lib/protocol';
import { randomArticle, randomArticles } from './wikipedia';

export type Env = {
	ROOM: DurableObjectNamespace<Room>;
	SESSION_SECRET: string;
	WIKIPEDIA_USER_AGENT?: string;
	/** The one hostname the game is served on. Everything else redirects to it. */
	CANONICAL_HOST?: string;
	/** Overrides where articles are drawn from. Set by the browser suite. */
	WIKIPEDIA_ORIGIN?: string;
};

type PlayerRow = {
	id: string;
	name: string;
	score: number;
	ready: number;
	is_host: number;
	joined_at: number;
	absent_since: number | null;
	/** The article this player is currently looking at, as JSON. */
	candidate: string | null;
	rerolls_used: number;
	locked_in: number;
};

/** How long a disconnected player keeps their seat in the lobby. */
const LOBBY_GRACE_MS = 30_000;
/** How long a room with nobody in it survives before it is erased. */
const ABANDONED_MS = 60 * 60 * 1000;
/** The longest the housekeeping alarm will sleep. */
const SWEEP_INTERVAL_MS = 15_000;

/**
 * One instance of this object per room, addressed by room code.
 *
 * Everything the game rules depend on lives here and only here. Clients send
 * intent ("lock in", "I name Ada") and receive state; they never assert state.
 * That makes cheating a matter of compromising the object rather than the
 * browser, and it removes the races the previous PocketBase design had, because
 * a durable object handles one request at a time.
 *
 * The one exception to that serialisation is fetching from Wikipedia: an
 * external request lets other messages interleave. Every path that awaits one
 * re-checks `generation()` afterwards and discards its result if the round has
 * moved on in the meantime.
 */
export class Room extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		ctx.blockConcurrencyWhile(async () => this.migrate());
	}

	private migrate(): void {
		const sql = this.ctx.storage.sql;
		sql.exec(`
			CREATE TABLE IF NOT EXISTS _migrations (
				id INTEGER PRIMARY KEY,
				applied_at TEXT NOT NULL DEFAULT (datetime('now'))
			)
		`);

		const version = sql
			.exec<{ version: number }>('SELECT COALESCE(MAX(id), 0) AS version FROM _migrations')
			.one().version;

		if (version < 1) {
			sql.exec(`
				CREATE TABLE players (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					score INTEGER NOT NULL DEFAULT 0,
					ready INTEGER NOT NULL DEFAULT 0,
					is_host INTEGER NOT NULL DEFAULT 0,
					joined_at INTEGER NOT NULL,
					absent_since INTEGER,
					candidate TEXT,
					rerolls_used INTEGER NOT NULL DEFAULT 0,
					locked_in INTEGER NOT NULL DEFAULT 0
				);
				CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
				INSERT INTO _migrations (id) VALUES (1);
			`);
		}
	}

	// --- stored odds and ends -------------------------------------------------

	private readMeta<T>(key: string, fallback: T): T {
		const row = this.ctx.storage.sql
			.exec<{ value: string }>('SELECT value FROM meta WHERE key = ?', key)
			.toArray()[0];
		if (!row) return fallback;
		try {
			return JSON.parse(row.value) as T;
		} catch {
			return fallback;
		}
	}

	private writeMeta(key: string, value: unknown): void {
		this.ctx.storage.sql.exec(
			'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
			key,
			JSON.stringify(value ?? null)
		);
	}

	private get stage(): Stage {
		return this.readMeta<Stage>('stage', 'lobby');
	}

	private get settings(): RoomSettings {
		return { ...DEFAULT_SETTINGS, ...this.readMeta<Partial<RoomSettings>>('settings', {}) };
	}

	/**
	 * A token for "the round as it stands now". Anything that awaits an external
	 * request compares this before and after, and drops its result if it changed.
	 */
	private generation(): string {
		return `${this.stage}:${this.readMeta<number>('round', 0)}`;
	}

	private players(): PlayerRow[] {
		return this.ctx.storage.sql
			.exec<PlayerRow>('SELECT * FROM players ORDER BY joined_at ASC')
			.toArray();
	}

	private player(id: string): PlayerRow | undefined {
		return this.ctx.storage.sql
			.exec<PlayerRow>('SELECT * FROM players WHERE id = ?', id)
			.toArray()[0];
	}

	/** Everyone who is not this round's guesser. */
	private guessees(): PlayerRow[] {
		const guesserId = this.readMeta<string | null>('guesser_id', null);
		return this.players().filter((player) => player.id !== guesserId);
	}

	// --- connections ----------------------------------------------------------

	/**
	 * Ids with at least one live socket. `excluding` exists because a socket is
	 * still listed while its own close handler runs.
	 */
	private connectedIds(excluding?: WebSocket): Set<string> {
		const ids = new Set<string>();
		for (const socket of this.ctx.getWebSockets()) {
			if (socket === excluding) continue;
			const id = socket.deserializeAttachment();
			if (typeof id === 'string') ids.add(id);
		}
		return ids;
	}

	/** Stamp the moment each absent player became absent, so the sweep can age them out. */
	private refreshPresence(excluding?: WebSocket): void {
		const connected = this.connectedIds(excluding);
		const now = Date.now();
		for (const player of this.players()) {
			const isConnected = connected.has(player.id);
			if (isConnected && player.absent_since !== null) {
				this.ctx.storage.sql.exec('UPDATE players SET absent_since = NULL WHERE id = ?', player.id);
			} else if (!isConnected && player.absent_since === null) {
				this.ctx.storage.sql.exec(
					'UPDATE players SET absent_since = ? WHERE id = ?',
					now,
					player.id
				);
			}
		}
	}

	/** If the host has gone, hand the room to the longest-standing player still here. */
	private ensureHost(excluding?: WebSocket): void {
		const players = this.players();
		if (players.length === 0) return;

		const connected = this.connectedIds(excluding);
		const host = players.find((player) => player.is_host === 1);
		if (host && connected.has(host.id)) return;

		const heir = players.find((player) => connected.has(player.id)) ?? players[0];
		this.ctx.storage.sql.exec('UPDATE players SET is_host = 0 WHERE is_host = 1');
		this.ctx.storage.sql.exec('UPDATE players SET is_host = 1 WHERE id = ?', heir.id);
	}

	// --- state ----------------------------------------------------------------

	private snapshot(excluding?: WebSocket): RoomState {
		const connected = this.connectedIds(excluding);
		const stage = this.stage;
		const article = this.readMeta<Article | null>('article', null);
		const readingEndsAt = this.readMeta<number | null>('reading_ends_at', null);
		const revealed = stage === 'reveal' || stage === 'finished';
		const done = this.doneReaders();

		const players: PublicPlayer[] = this.players().map((player) => ({
			id: player.id,
			name: player.name,
			score: player.score,
			connected: connected.has(player.id),
			isHost: player.is_host === 1,
			ready: player.ready === 1,
			lockedIn: player.locked_in === 1,
			doneReading: done.has(player.id)
		}));

		return {
			code: this.readMeta<string>('code', ''),
			stage,
			players,
			round: this.readMeta<number>('round', 0),
			settings: this.settings,
			guesserId: this.readMeta<string | null>('guesser_id', null),
			// The title is announced when the questioning starts, not before. While
			// everyone is still reading, knowing which article was drawn would tell
			// each player whether theirs was picked, and the bluffers would stop.
			// The text stays private until the round is over.
			article:
				article && (stage === 'questioning' || revealed)
					? { title: article.title, description: article.description }
					: null,
			readingMsLeft:
				stage === 'reading' && readingEndsAt !== null
					? Math.max(0, readingEndsAt - Date.now())
					: null,
			readerId: revealed ? this.readMeta<string | null>('reader_id', null) : null,
			revealedArticle: revealed ? article : null,
			guessId: this.readMeta<string | null>('guess_id', null),
			awards: revealed ? this.readMeta<Record<string, number> | null>('awards', null) : null
		};
	}

	/** The part of the state that belongs to one player alone. */
	private privateFor(playerId: string): PrivateState {
		const player = this.player(playerId);
		const candidate = player?.candidate ? (JSON.parse(player.candidate) as Article) : null;
		const isReader = this.readMeta<string | null>('reader_id', null) === playerId;

		return {
			// While picking you weigh up your own article on its title alone; the
			// text comes later, when everybody reads.
			candidate: candidate ? { title: candidate.title, description: candidate.description } : null,
			rerollsLeft: Math.max(0, this.settings.rerolls - (player?.rerolls_used ?? 0)),
			lockedIn: player?.locked_in === 1,
			// Your own article, whether or not it turns out to be the one asked
			// about. Not knowing is the point: it is what keeps everyone reading,
			// and it means the guesser cannot simply watch for the one person who
			// is actually reading something.
			reading: this.stage === 'reading' ? candidate : null,
			doneReading: this.doneReaders().has(playerId),
			// Withheld until the questioning. During the reading nobody knows.
			isReader:
				isReader &&
				(this.stage === 'questioning' || this.stage === 'reveal' || this.stage === 'finished')
		};
	}

	/** Public read of room state, for tests and diagnostics. */
	async describe(): Promise<RoomState> {
		return this.snapshot();
	}

	private send(socket: WebSocket, message: ServerMessage): void {
		try {
			socket.send(JSON.stringify(message));
		} catch {
			// The socket died between listing it and writing to it. The close
			// handler will tidy up; there is nothing useful to do here.
		}
	}

	private sendError(socket: WebSocket, code: ErrorCode, message: string): void {
		this.send(socket, { type: 'error', code, message });
	}

	/** Push the room to everyone, each socket getting its own private half. */
	private broadcast(excluding?: WebSocket): void {
		const state = this.snapshot(excluding);
		for (const socket of this.ctx.getWebSockets()) {
			if (socket === excluding) continue;
			const id = socket.deserializeAttachment();
			if (typeof id !== 'string') continue;
			this.send(socket, { type: 'state', state, you: id, private: this.privateFor(id) });
		}
	}

	private broadcastError(code: ErrorCode, message: string): void {
		for (const socket of this.ctx.getWebSockets()) this.sendError(socket, code, message);
	}

	// --- joining --------------------------------------------------------------

	/**
	 * Seat a player, or say why they cannot be seated. A player already on the
	 * list is always let back in, whatever the stage, so a dropped connection
	 * mid-game is recoverable.
	 */
	private admit(playerId: string, code: string, requestedName: string): ErrorCode | null {
		if (this.readMeta<string>('code', '') === '') this.writeMeta('code', code);

		const existing = this.player(playerId);
		const name = cleanName(requestedName);

		if (existing) {
			if (name && name !== existing.name) {
				this.ctx.storage.sql.exec('UPDATE players SET name = ? WHERE id = ?', name, playerId);
			}
			return null;
		}

		if (this.stage !== 'lobby') return 'game-in-progress';

		const count = this.ctx.storage.sql
			.exec<{ count: number }>('SELECT COUNT(*) AS count FROM players')
			.one().count;
		if (count >= MAX_PLAYERS) return 'room-full';

		this.ctx.storage.sql.exec(
			'INSERT INTO players (id, name, score, ready, is_host, joined_at, absent_since) VALUES (?, ?, 0, 0, ?, ?, NULL)',
			playerId,
			name ?? randomName(),
			count === 0 ? 1 : 0,
			Date.now()
		);
		return null;
	}

	override async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname !== '/ws') return new Response('not found', { status: 404 });
		if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
			return new Response('expected a websocket upgrade', { status: 426 });
		}

		// The worker in front of this object verified the signature on the player
		// token before rewriting it to `pid`, and this object is not routable from
		// outside that worker, so the id can be trusted here.
		const playerId = url.searchParams.get('pid');
		const code = url.searchParams.get('code');
		if (!playerId || !code) return new Response('missing pid or code', { status: 400 });

		const pair = new WebSocketPair();
		const server = pair[1];
		this.ctx.acceptWebSocket(server, [playerId]);
		server.serializeAttachment(playerId);

		const refusal = this.admit(playerId, code, url.searchParams.get('name') ?? '');
		if (refusal) {
			this.sendError(server, refusal, REFUSAL_TEXT[refusal]);
			server.close(1008, refusal);
			return new Response(null, { status: 101, webSocket: pair[0] });
		}

		this.refreshPresence();
		this.ensureHost();
		this.broadcast();
		await this.rescheduleAlarm();

		return new Response(null, { status: 101, webSocket: pair[0] });
	}

	// --- messages -------------------------------------------------------------

	override async webSocketMessage(socket: WebSocket, raw: string | ArrayBuffer): Promise<void> {
		const playerId = socket.deserializeAttachment();
		if (typeof playerId !== 'string') return socket.close(1008, 'unidentified');

		let message: ClientMessage;
		try {
			const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
			message = JSON.parse(text) as ClientMessage;
		} catch {
			return this.sendError(socket, 'bad-request', 'That was not valid JSON.');
		}

		switch (message?.type) {
			case 'ping':
				return this.send(socket, { type: 'pong' });

			case 'set-name': {
				const name = cleanName(String(message.name ?? ''));
				if (!name) return this.sendError(socket, 'bad-request', 'That name is empty.');
				this.ctx.storage.sql.exec('UPDATE players SET name = ? WHERE id = ?', name, playerId);
				return this.broadcast();
			}

			case 'set-ready': {
				if (this.stage !== 'lobby') return;
				this.ctx.storage.sql.exec(
					'UPDATE players SET ready = ? WHERE id = ?',
					message.ready ? 1 : 0,
					playerId
				);
				return this.broadcast();
			}

			case 'set-settings':
				return this.setSettings(socket, playerId, message.settings);

			case 'start':
				return this.start(socket, playerId);

			case 'reroll':
				return this.reroll(socket, playerId);

			case 'lock-in':
				return this.lockIn(socket, playerId);

			case 'done-reading':
				return this.doneReading(playerId);

			case 'guess':
				return this.guess(socket, playerId, String(message.playerId ?? ''));

			case 'next-round':
				return this.nextRound(socket, playerId);

			case 'abort-round':
				return this.abortRound(socket, playerId);

			case 'play-again':
				return this.playAgain(socket, playerId);

			default:
				return this.sendError(socket, 'bad-request', 'Unrecognised message.');
		}
	}

	private isHost(playerId: string): boolean {
		return this.player(playerId)?.is_host === 1;
	}

	private requireHost(socket: WebSocket, playerId: string): boolean {
		if (this.isHost(playerId)) return true;
		this.sendError(socket, 'not-host', 'Only the host can do that.');
		return false;
	}

	private setSettings(socket: WebSocket, playerId: string, patch: Partial<RoomSettings>): void {
		if (!this.requireHost(socket, playerId)) return;
		if (this.stage !== 'lobby') return;

		const current = this.settings;
		const clamp = (key: keyof RoomSettings) => {
			const value = Number(patch?.[key] ?? current[key]);
			if (!Number.isFinite(value)) return current[key];
			const { min, max } = SETTING_LIMITS[key];
			return Math.min(max, Math.max(min, Math.round(value)));
		};

		this.writeMeta('settings', {
			rounds: clamp('rounds'),
			rerolls: clamp('rerolls'),
			readingSeconds: clamp('readingSeconds')
		});
		this.broadcast();
	}

	// --- the round ------------------------------------------------------------

	private start(socket: WebSocket, playerId: string): void {
		if (!this.requireHost(socket, playerId)) return;
		if (this.stage !== 'lobby') return;

		const connected = this.connectedIds();
		const present = this.players().filter((player) => connected.has(player.id));
		if (present.length < MIN_PLAYERS) {
			return this.sendError(
				socket,
				'not-enough-players',
				`You need at least ${MIN_PLAYERS} players to start.`
			);
		}
		if (present.some((player) => player.ready !== 1)) {
			return this.sendError(socket, 'not-everyone-ready', 'Everyone has to be ready first.');
		}

		// Players who wandered off before the game began do not get carried into it.
		this.ctx.storage.sql.exec('DELETE FROM players WHERE absent_since IS NOT NULL');
		this.ctx.storage.sql.exec('UPDATE players SET ready = 0, score = 0');

		const contenders = this.players();
		const first = contenders[Math.floor(Math.random() * contenders.length)];
		this.writeMeta('guesser_id', first.id);
		this.writeMeta('round', 1);
		void this.beginPicking();
	}

	/**
	 * Deal a fresh article to every guessee and let them redraw until they find
	 * one they would be willing to be caught holding.
	 */
	private async beginPicking(): Promise<void> {
		this.writeMeta('stage', 'picking' satisfies Stage);
		this.writeMeta('article', null);
		this.writeMeta('reader_id', null);
		this.writeMeta('guess_id', null);
		this.writeMeta('awards', null);
		this.writeMeta('reading_ends_at', null);
		this.writeMeta('done_reading', []);
		this.ctx.storage.sql.exec(
			'UPDATE players SET candidate = NULL, rerolls_used = 0, locked_in = 0, ready = 0'
		);
		this.broadcast();

		const targets = this.guessees();
		if (targets.length === 0) return;

		const generation = this.generation();
		let articles: Article[];
		try {
			articles = await randomArticles(
				targets.length,
				this.env.WIKIPEDIA_USER_AGENT,
				undefined,
				this.env.WIKIPEDIA_ORIGIN
			);
		} catch (error) {
			console.error('could not deal articles', error);
			return this.broadcastError(
				'wikipedia-unavailable',
				'Wikipedia is not answering. The host can abandon the round and try again.'
			);
		}
		if (this.generation() !== generation) return;

		targets.forEach((player, index) => {
			this.ctx.storage.sql.exec(
				'UPDATE players SET candidate = ? WHERE id = ?',
				JSON.stringify(articles[index]),
				player.id
			);
		});
		this.broadcast();
	}

	private async reroll(socket: WebSocket, playerId: string): Promise<void> {
		if (this.stage !== 'picking') return;

		const player = this.player(playerId);
		if (!player || player.id === this.readMeta<string | null>('guesser_id', null)) return;
		if (player.locked_in === 1) return;
		if (player.rerolls_used >= this.settings.rerolls) {
			return this.sendError(socket, 'no-rerolls-left', 'You have used all your redraws.');
		}

		// Spend the redraw before the request, not after, so holding the button
		// down cannot buy more draws than the budget allows.
		this.ctx.storage.sql.exec(
			'UPDATE players SET rerolls_used = rerolls_used + 1 WHERE id = ?',
			playerId
		);
		this.broadcast();

		const generation = this.generation();
		let article: Article;
		try {
			article = await randomArticle(
				this.env.WIKIPEDIA_USER_AGENT,
				undefined,
				this.env.WIKIPEDIA_ORIGIN
			);
		} catch (error) {
			console.error('reroll failed', error);
			this.ctx.storage.sql.exec(
				'UPDATE players SET rerolls_used = MAX(0, rerolls_used - 1) WHERE id = ?',
				playerId
			);
			this.broadcast();
			return this.sendError(
				socket,
				'wikipedia-unavailable',
				'Wikipedia did not answer. Try again.'
			);
		}
		if (this.generation() !== generation) return;

		this.ctx.storage.sql.exec(
			'UPDATE players SET candidate = ? WHERE id = ?',
			JSON.stringify(article),
			playerId
		);
		this.broadcast();
	}

	private async lockIn(socket: WebSocket, playerId: string): Promise<void> {
		if (this.stage !== 'picking') return;

		const player = this.player(playerId);
		if (!player || player.id === this.readMeta<string | null>('guesser_id', null)) return;
		if (!player.candidate) {
			return this.sendError(socket, 'bad-request', 'You have not been dealt an article yet.');
		}

		this.ctx.storage.sql.exec('UPDATE players SET locked_in = 1 WHERE id = ?', playerId);
		this.broadcast();
		await this.maybeBeginReading();
	}

	/**
	 * Start reading once everyone still connected has settled. Absent players are
	 * not waited for, or one closed tab would hang the round.
	 */
	private async maybeBeginReading(excluding?: WebSocket): Promise<void> {
		if (this.stage !== 'picking') return;

		const connected = this.connectedIds(excluding);
		const waiting = this.guessees().filter((player) => connected.has(player.id));
		if (waiting.length === 0) return;
		if (waiting.some((player) => player.locked_in !== 1)) return;

		const holders = waiting.filter((player) => player.candidate);
		if (holders.length === 0) return;

		// Every locked-in article is equally likely to be the one, which is what
		// makes the redraw a real decision for everybody and not just the reader.
		const reader = holders[Math.floor(Math.random() * holders.length)];
		this.writeMeta('reader_id', reader.id);
		this.writeMeta('article', JSON.parse(reader.candidate!) as Article);
		this.writeMeta('stage', 'reading' satisfies Stage);
		this.writeMeta('reading_ends_at', Date.now() + this.settings.readingSeconds * 1000);
		this.broadcast();
		await this.rescheduleAlarm();
	}

	private doneReaders(): Set<string> {
		return new Set(this.readMeta<string[]>('done_reading', []));
	}

	/**
	 * A player saying they have finished with their own article. The questioning
	 * starts early only once everyone still connected has said so — one fast
	 * reader must not cut the clock on everybody else.
	 */
	private doneReading(playerId: string): void {
		if (this.stage !== 'reading') return;

		const player = this.player(playerId);
		if (!player || !player.candidate) return;
		if (player.id === this.readMeta<string | null>('guesser_id', null)) return;

		const done = this.doneReaders();
		if (done.has(playerId)) return;
		done.add(playerId);
		this.writeMeta('done_reading', [...done]);

		const connected = this.connectedIds();
		const waiting = this.guessees().filter((other) => connected.has(other.id));
		if (waiting.every((other) => done.has(other.id))) return this.beginQuestioning();

		this.broadcast();
	}

	private beginQuestioning(): void {
		this.writeMeta('stage', 'questioning' satisfies Stage);
		this.writeMeta('reading_ends_at', null);
		this.writeMeta('done_reading', []);
		this.broadcast();
	}

	private guess(socket: WebSocket, playerId: string, targetId: string): void {
		if (this.stage !== 'questioning') return;

		const guesserId = this.readMeta<string | null>('guesser_id', null);
		if (playerId !== guesserId) {
			return this.sendError(socket, 'not-guesser', 'Only the guesser names a reader.');
		}

		const target = this.player(targetId);
		if (!target || target.id === guesserId) {
			return this.sendError(socket, 'bad-request', 'Name one of the other players.');
		}

		const readerId = this.readMeta<string | null>('reader_id', null);
		const awards: Record<string, number> = {};
		if (targetId === readerId) {
			// The reader wanted to be found, so finding them pays both of them.
			if (guesserId) awards[guesserId] = SCORING.guesserCorrect;
			awards[readerId] = (awards[readerId] ?? 0) + SCORING.readerFound;
		} else {
			awards[targetId] = SCORING.bluffSucceeded;
		}

		for (const [id, points] of Object.entries(awards)) {
			this.ctx.storage.sql.exec('UPDATE players SET score = score + ? WHERE id = ?', points, id);
		}

		this.writeMeta('guess_id', targetId);
		this.writeMeta('awards', awards);
		this.writeMeta('stage', 'reveal' satisfies Stage);
		this.broadcast();
	}

	private nextRound(socket: WebSocket, playerId: string): void {
		if (this.stage !== 'reveal') return;
		if (!this.requireHost(socket, playerId)) return;

		// Whoever was named takes the chair, which is what keeps the role moving
		// without anyone having to decide who goes next.
		const named = this.readMeta<string | null>('guess_id', null);
		if (named && this.player(named)) this.writeMeta('guesser_id', named);

		const round = this.readMeta<number>('round', 1) + 1;
		if (round > this.settings.rounds) {
			this.writeMeta('stage', 'finished' satisfies Stage);
			this.broadcast();
			return;
		}

		this.writeMeta('round', round);
		void this.beginPicking();
	}

	/** For a round that cannot finish, usually because the guesser has vanished. */
	private abortRound(socket: WebSocket, playerId: string): void {
		if (!this.requireHost(socket, playerId)) return;
		if (this.stage === 'lobby' || this.stage === 'finished') return;

		// Nobody scores, and the chair passes on so the round is not simply replayed
		// with the same person stuck in it.
		const players = this.players();
		const guesserId = this.readMeta<string | null>('guesser_id', null);
		const connected = this.connectedIds();
		const eligible = players.filter((player) => connected.has(player.id));
		const next = eligible.find((player) => player.id !== guesserId) ?? eligible[0] ?? players[0];
		if (next) this.writeMeta('guesser_id', next.id);

		void this.beginPicking();
	}

	private playAgain(socket: WebSocket, playerId: string): void {
		if (this.stage !== 'finished') return;
		if (!this.requireHost(socket, playerId)) return;

		this.ctx.storage.sql.exec(
			'UPDATE players SET score = 0, ready = 0, candidate = NULL, rerolls_used = 0, locked_in = 0'
		);
		this.writeMeta('stage', 'lobby' satisfies Stage);
		this.writeMeta('round', 0);
		this.writeMeta('guesser_id', null);
		this.writeMeta('reader_id', null);
		this.writeMeta('article', null);
		this.writeMeta('guess_id', null);
		this.writeMeta('awards', null);
		this.broadcast();
	}

	// --- housekeeping ---------------------------------------------------------

	override async webSocketClose(socket: WebSocket): Promise<void> {
		this.refreshPresence(socket);
		this.ensureHost(socket);
		this.broadcast(socket);
		// Someone leaving can be the last thing a picking stage was waiting on.
		await this.maybeBeginReading(socket);
		await this.rescheduleAlarm();
	}

	override async webSocketError(socket: WebSocket): Promise<void> {
		await this.webSocketClose(socket);
	}

	/** Wake for whichever comes first: the reading deadline or the next sweep. */
	private async rescheduleAlarm(): Promise<void> {
		const readingEndsAt = this.readMeta<number | null>('reading_ends_at', null);
		const sweepAt = Date.now() + SWEEP_INTERVAL_MS;
		await this.ctx.storage.setAlarm(readingEndsAt ? Math.min(readingEndsAt, sweepAt) : sweepAt);
	}

	/**
	 * Ends the reading stage on time, drops players who left the lobby and never
	 * came back, and erases rooms nobody has been in for an hour.
	 */
	override async alarm(): Promise<void> {
		const now = Date.now();
		const readingEndsAt = this.readMeta<number | null>('reading_ends_at', null);
		if (this.stage === 'reading' && readingEndsAt !== null && now >= readingEndsAt) {
			this.beginQuestioning();
		}

		if (this.stage === 'lobby') {
			this.ctx.storage.sql.exec(
				'DELETE FROM players WHERE absent_since IS NOT NULL AND absent_since < ?',
				now - LOBBY_GRACE_MS
			);
			this.ensureHost();
		}

		const live = this.ctx.getWebSockets().length > 0;
		const players = this.players();
		const longestAbsence = players.reduce<number>(
			(oldest, player) => Math.min(oldest, player.absent_since ?? now),
			now
		);

		if (!live && (players.length === 0 || now - longestAbsence > ABANDONED_MS)) {
			await this.ctx.storage.deleteAll();
			return;
		}

		this.broadcast();
		await this.rescheduleAlarm();
	}
}

const REFUSAL_TEXT: Record<ErrorCode, string> = {
	'bad-token': 'Your player identity could not be verified.',
	'room-full': `That room already has ${MAX_PLAYERS} players in it.`,
	'game-in-progress': 'That game has already started.',
	'not-host': 'Only the host can do that.',
	'not-guesser': 'Only the guesser can do that.',
	'not-enough-players': `You need at least ${MIN_PLAYERS} players.`,
	'not-everyone-ready': 'Everyone has to be ready first.',
	'no-rerolls-left': 'You have used all your redraws.',
	'wikipedia-unavailable': 'Wikipedia is not answering right now.',
	'bad-request': 'That request did not make sense.',
	'server-error': 'Something went wrong on our end.'
};
