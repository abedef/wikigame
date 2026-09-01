import { env } from '$env/dynamic/public';
import type { ClientMessage, ErrorCode, PrivateState, RoomState } from './protocol';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

/** The socket is closed with this code when the room refuses us outright. */
const POLICY_VIOLATION = 1008;
const HEARTBEAT_MS = 25_000;
const MAX_BACKOFF_MS = 10_000;

/**
 * In development the pages are served by Vite but the durable object lives in a
 * separate `wrangler dev` process, so the socket has to cross origins. In
 * production PUBLIC_GAME_SERVER is unset and everything is same-origin.
 */
function gameServerOrigin(): string {
	const configured = env.PUBLIC_GAME_SERVER?.trim();
	return configured || location.origin;
}

/**
 * A live view of one room.
 *
 * The room state here is whatever the server last said it was; nothing is
 * predicted locally. Every player action is a message asking the server to do
 * something, and the answer arrives as a fresh snapshot.
 */
export class GameConnection {
	state = $state<RoomState | null>(null);
	/** The half of the state that is this player's alone: their candidate
	 *  article, their redraw budget, and their own article while everyone reads. */
	own = $state<PrivateState>({
		candidate: null,
		rerollsLeft: 0,
		lockedIn: false,
		reading: null,
		doneReading: false,
		isReader: false
	});
	/** When the last state arrived, so a countdown can run on from it locally. */
	receivedAt = $state(0);
	/** Which player in `state.players` this browser is. */
	you = $state<string | null>(null);
	error = $state<{ code: ErrorCode; message: string } | null>(null);
	status = $state<ConnectionStatus>('connecting');

	readonly me = $derived(this.state?.players.find((player) => player.id === this.you) ?? null);
	readonly isHost = $derived(this.me?.isHost ?? false);
	readonly isGuesser = $derived(this.state?.guesserId != null && this.state.guesserId === this.you);

	#socket: WebSocket | null = null;
	#heartbeat: ReturnType<typeof setInterval> | null = null;
	#retry: ReturnType<typeof setTimeout> | null = null;
	#attempts = 0;
	#closedByUs = false;

	constructor(
		private readonly code: string,
		private readonly token: string,
		private readonly name: string
	) {}

	connect(): void {
		this.#closedByUs = false;

		// A throwaway used to assemble the socket address. It is never read after
		// the connection opens, so it does not need to be reactive.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const url = new URL(`/api/room/${encodeURIComponent(this.code)}/ws`, gameServerOrigin());
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
		url.searchParams.set('t', this.token);
		url.searchParams.set('name', this.name);

		const socket = new WebSocket(url);
		this.#socket = socket;

		socket.addEventListener('open', () => {
			this.#attempts = 0;
			this.status = 'open';
			this.#heartbeat = setInterval(() => this.send({ type: 'ping' }), HEARTBEAT_MS);
		});

		socket.addEventListener('message', (event) => {
			let message;
			try {
				message = JSON.parse(String(event.data));
			} catch {
				return;
			}
			if (message.type === 'state') {
				this.state = message.state;
				this.own = message.private;
				this.you = message.you;
				this.receivedAt = Date.now();
				this.error = null;
			} else if (message.type === 'error') {
				this.error = { code: message.code, message: message.message };
			}
		});

		socket.addEventListener('close', (event) => {
			this.#stopHeartbeat();
			// A refusal is final: retrying a full room or a game already in progress
			// would just be refused again.
			if (this.#closedByUs || event.code === POLICY_VIOLATION) {
				this.status = 'closed';
				return;
			}
			this.status = 'reconnecting';
			this.#scheduleRetry();
		});
	}

	send(message: ClientMessage): void {
		if (this.#socket?.readyState === WebSocket.OPEN) {
			this.#socket.send(JSON.stringify(message));
		}
	}

	close(): void {
		this.#closedByUs = true;
		this.#stopHeartbeat();
		if (this.#retry) clearTimeout(this.#retry);
		this.#socket?.close(1000, 'left');
		this.status = 'closed';
	}

	#stopHeartbeat(): void {
		if (this.#heartbeat) clearInterval(this.#heartbeat);
		this.#heartbeat = null;
	}

	#scheduleRetry(): void {
		// Exponential backoff with jitter, so a server restart does not bring every
		// player in the room back in the same instant.
		const delay = Math.min(MAX_BACKOFF_MS, 2 ** this.#attempts * 250);
		this.#attempts++;
		this.#retry = setTimeout(() => this.connect(), delay * (0.5 + Math.random() / 2));
	}
}
