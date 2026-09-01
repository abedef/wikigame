import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import type { PrivateState, RoomState, ServerMessage } from '../src/lib/protocol';

/**
 * Exercises the real durable object on the real runtime. Wikipedia is stubbed by
 * the outbound service in vitest.config.ts, so rounds are deterministic and the
 * tests never reach the network.
 */

type Client = {
	id: string;
	socket: WebSocket;
	state: RoomState | null;
	own: PrivateState | null;
	errors: Extract<ServerMessage, { type: 'error' }>[];
};

let rooms = 0;
const nextCode = () => `T${String(++rooms).padStart(3, '0')}`;
const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

async function join(code: string, id: string, name: string): Promise<Client> {
	const response = await env.ROOM.getByName(code).fetch(
		`http://room/ws?pid=${id}&code=${code}&name=${encodeURIComponent(name)}`,
		{ headers: { Upgrade: 'websocket' } }
	);
	const socket = response.webSocket!;
	const client: Client = { id, socket, state: null, own: null, errors: [] };
	socket.accept();
	socket.addEventListener('message', (event) => {
		const message = JSON.parse(String(event.data)) as ServerMessage;
		if (message.type === 'state') {
			client.state = message.state;
			client.own = message.private;
		} else if (message.type === 'error') {
			client.errors.push(message);
		}
	});
	await tick();
	return client;
}

const send = (client: Client, message: unknown) => client.socket.send(JSON.stringify(message));

async function waitFor(predicate: () => boolean, label: string, timeout = 5000): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		if (predicate()) return;
		await tick(25);
	}
	throw new Error(`timed out waiting for ${label}`);
}

/** A lobby of three, readied up, ready to start. */
async function lobby(code: string, settings?: Record<string, number>) {
	const clients = [
		await join(code, 'p1', 'Ada'),
		await join(code, 'p2', 'Brendan'),
		await join(code, 'p3', 'Cleo')
	];
	// Settings are lobby-only, so anything a test needs has to be set before the start.
	if (settings) send(clients[0], { type: 'set-settings', settings });
	for (const client of clients) send(client, { type: 'set-ready', ready: true });
	await tick();
	return clients;
}

describe('the lobby', () => {
	it('seats players and makes the first one host', async () => {
		const [ada, , cleo] = await lobby(nextCode());
		expect(ada.state!.players).toHaveLength(3);
		expect(ada.state!.players.filter((p) => p.isHost)).toHaveLength(1);
		expect(ada.state!.players.find((p) => p.isHost)!.id).toBe('p1');
		// Everyone sees the same room.
		expect(cleo.state!.players).toHaveLength(3);
	});

	it('refuses to start for anyone but the host', async () => {
		const [, brendan] = await lobby(nextCode());
		send(brendan, { type: 'start' });
		await tick();
		expect(brendan.errors.at(-1)?.code).toBe('not-host');
	});

	it('refuses to start below the minimum', async () => {
		const code = nextCode();
		const ada = await join(code, 'p1', 'Ada');
		send(ada, { type: 'set-ready', ready: true });
		await tick();
		send(ada, { type: 'start' });
		await tick();
		expect(ada.errors.at(-1)?.code).toBe('not-enough-players');
		expect(ada.state!.stage).toBe('lobby');
	});

	it('clamps settings and only lets the host change them', async () => {
		const [ada, brendan] = await lobby(nextCode());
		send(brendan, { type: 'set-settings', settings: { rounds: 3 } });
		await tick();
		expect(brendan.errors.at(-1)?.code).toBe('not-host');

		send(ada, { type: 'set-settings', settings: { rounds: 9999, rerolls: -5 } });
		await tick();
		expect(ada.state!.settings.rounds).toBe(20);
		expect(ada.state!.settings.rerolls).toBe(0);
	});

	it('turns away a latecomer once the game is going', async () => {
		const code = nextCode();
		const [ada] = await lobby(code);
		send(ada, { type: 'start' });
		await waitFor(() => ada.state!.stage === 'picking', 'picking');

		const late = await join(code, 'p4', 'Dmitri');
		await tick();
		expect(late.errors.at(-1)?.code).toBe('game-in-progress');
		expect(ada.state!.players).toHaveLength(3);
	});
});

describe('a round', () => {
	it('deals to the guessees only, and keeps the text private', async () => {
		const code = nextCode();
		const clients = await lobby(code);
		send(clients[0], { type: 'start' });
		await waitFor(() => clients[0].state!.stage === 'picking', 'picking');

		const guesserId = clients[0].state!.guesserId!;
		const guesser = clients.find((c) => c.id === guesserId)!;
		const guessees = clients.filter((c) => c.id !== guesserId);

		await waitFor(() => guessees.every((c) => c.own!.candidate), 'articles dealt');
		expect(guesser.own!.candidate).toBeNull();
		// A candidate is a title and a description. The prose is not on offer.
		for (const client of guessees) {
			expect(Object.keys(client.own!.candidate!).sort()).toEqual(['description', 'title']);
			expect(client.own!.reading).toBeNull();
		}
		expect(clients[0].state!.article).toBeNull();
	});

	it('spends redraws and stops at zero', async () => {
		const code = nextCode();
		const clients = await lobby(code);
		send(clients[0], { type: 'set-settings', settings: { rerolls: 1 } });
		await tick();
		send(clients[0], { type: 'start' });
		await waitFor(() => clients[0].state!.stage === 'picking', 'picking');

		const guessee = clients.find((c) => c.id !== clients[0].state!.guesserId)!;
		await waitFor(() => !!guessee.own!.candidate, 'a candidate');
		const first = guessee.own!.candidate!.title;
		expect(guessee.own!.rerollsLeft).toBe(1);

		send(guessee, { type: 'reroll' });
		await waitFor(() => guessee.own!.candidate!.title !== first, 'a redraw');
		expect(guessee.own!.rerollsLeft).toBe(0);

		send(guessee, { type: 'reroll' });
		await tick(100);
		expect(guessee.errors.at(-1)?.code).toBe('no-rerolls-left');
	});

	it('starts reading only once everyone has locked in', async () => {
		const code = nextCode();
		const clients = await lobby(code);
		send(clients[0], { type: 'start' });
		await waitFor(() => clients[0].state!.stage === 'picking', 'picking');

		const guessees = clients.filter((c) => c.id !== clients[0].state!.guesserId);
		await waitFor(() => guessees.every((c) => c.own!.candidate), 'articles dealt');

		send(guessees[0], { type: 'lock-in' });
		await tick(100);
		expect(clients[0].state!.stage).toBe('picking');

		send(guessees[1], { type: 'lock-in' });
		await waitFor(() => clients[0].state!.stage === 'reading', 'reading');

		const readers = clients.filter((c) => c.own!.reading);
		expect(readers).toHaveLength(1);
		expect(readers[0].id).not.toBe(clients[0].state!.guesserId);
		expect(readers[0].own!.isReader).toBe(true);
		// The title is common knowledge; who drew it, and what it says, are not.
		expect(clients[0].state!.article!.title).toBe(readers[0].own!.reading!.title);
		expect(clients[0].state!.readerId).toBeNull();
		expect(clients[0].state!.revealedArticle).toBeNull();
		expect(clients.filter((c) => c.own!.isReader)).toHaveLength(1);
	});
});

/** Play up to the point where the guesser must name someone. */
async function playToQuestioning(code: string, settings?: Record<string, number>) {
	const clients = await lobby(code, settings);
	send(clients[0], { type: 'start' });
	await waitFor(() => clients[0].state!.stage === 'picking', 'picking');

	const guesserId = clients[0].state!.guesserId!;
	const guesser = clients.find((c) => c.id === guesserId)!;
	const guessees = clients.filter((c) => c.id !== guesserId);
	await waitFor(() => guessees.every((c) => c.own!.candidate), 'articles dealt');
	for (const client of guessees) send(client, { type: 'lock-in' });
	await waitFor(() => clients[0].state!.stage === 'reading', 'reading');

	const reader = clients.find((c) => c.own!.isReader)!;
	send(reader, { type: 'done-reading' });
	await waitFor(() => clients[0].state!.stage === 'questioning', 'questioning');

	return { clients, guesser, reader, bluffer: guessees.find((c) => c.id !== reader.id)! };
}

describe('questioning and scoring', () => {
	it('only lets the reader end the reading early', async () => {
		const code = nextCode();
		const clients = await lobby(code);
		send(clients[0], { type: 'start' });
		await waitFor(() => clients[0].state!.stage === 'picking', 'picking');
		const guessees = clients.filter((c) => c.id !== clients[0].state!.guesserId);
		await waitFor(() => guessees.every((c) => c.own!.candidate), 'articles dealt');
		for (const client of guessees) send(client, { type: 'lock-in' });
		await waitFor(() => clients[0].state!.stage === 'reading', 'reading');

		const notReader = clients.find((c) => !c.own!.isReader)!;
		send(notReader, { type: 'done-reading' });
		await tick(100);
		expect(clients[0].state!.stage).toBe('reading');
	});

	it('lets only the guesser name a reader', async () => {
		const { clients, bluffer, reader } = await playToQuestioning(nextCode());
		send(bluffer, { type: 'guess', playerId: reader.id });
		await tick(100);
		expect(bluffer.errors.at(-1)?.code).toBe('not-guesser');
		expect(clients[0].state!.stage).toBe('questioning');
	});

	it('pays the guesser and the reader when the reader is found', async () => {
		const { clients, guesser, reader } = await playToQuestioning(nextCode());
		send(guesser, { type: 'guess', playerId: reader.id });
		await waitFor(() => clients[0].state!.stage === 'reveal', 'reveal');

		const state = clients[0].state!;
		expect(state.readerId).toBe(reader.id);
		expect(state.awards![guesser.id]).toBe(2);
		expect(state.awards![reader.id]).toBe(2);
		expect(state.players.find((p) => p.id === guesser.id)!.score).toBe(2);
		expect(state.players.find((p) => p.id === reader.id)!.score).toBe(2);
		// The whole article is published once the round is over.
		expect(state.revealedArticle!.extract.length).toBeGreaterThan(100);
	});

	it('pays the bluffer alone when the guesser is fooled', async () => {
		const { clients, guesser, reader, bluffer } = await playToQuestioning(nextCode());
		send(guesser, { type: 'guess', playerId: bluffer.id });
		await waitFor(() => clients[0].state!.stage === 'reveal', 'reveal');

		const state = clients[0].state!;
		expect(state.awards).toEqual({ [bluffer.id]: 3 });
		expect(state.players.find((p) => p.id === guesser.id)!.score).toBe(0);
		expect(state.players.find((p) => p.id === reader.id)!.score).toBe(0);
		expect(state.players.find((p) => p.id === bluffer.id)!.score).toBe(3);
	});

	it('passes the chair to whoever was named, and ends after the last round', async () => {
		const { clients, guesser, bluffer } = await playToQuestioning(nextCode(), { rounds: 1 });
		expect(clients[0].state!.settings.rounds).toBe(1);
		send(guesser, { type: 'guess', playerId: bluffer.id });
		await waitFor(() => clients[0].state!.stage === 'reveal', 'reveal');

		send(clients[0], { type: 'next-round' });
		await waitFor(() => clients[0].state!.stage === 'finished', 'the end');
		expect(clients[0].state!.players.find((p) => p.id === bluffer.id)!.score).toBe(3);

		send(clients[0], { type: 'play-again' });
		await waitFor(() => clients[0].state!.stage === 'lobby', 'a fresh lobby');
		expect(clients[0].state!.players.every((p) => p.score === 0)).toBe(true);
		expect(clients[0].state!.round).toBe(0);
	});
});
