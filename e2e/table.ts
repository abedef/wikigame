import type { ClientMessage, PrivateState, RoomState, ServerMessage } from '../src/lib/protocol';

/**
 * Bot players, so a browser can sit at a full table.
 *
 * The game needs three people before it will start anything, and most of what
 * is worth testing only exists once a round is running. These fill the other
 * seats over the same WebSocket the real client uses, so nothing is faked
 * except the person.
 */
export type Bot = {
	name: string;
	id: string;
	state: RoomState | null;
	own: PrivateState | null;
	send: (message: ClientMessage) => void;
	close: () => void;
};

export async function createRoom(baseURL: string): Promise<string> {
	const response = await fetch(new URL('/api/rooms', baseURL), { method: 'POST' });
	if (!response.ok) throw new Error(`could not create a room: ${response.status}`);
	return ((await response.json()) as { code: string }).code;
}

/** A signed identity, minted the same way a browser gets one. */
async function mintToken(baseURL: string): Promise<string> {
	const response = await fetch(new URL('/', baseURL));
	const cookie = response.headers
		.getSetCookie()
		.find((value) => value.startsWith('player='))
		?.split(';')[0]
		?.slice('player='.length);
	if (!cookie) throw new Error('the page did not set a player cookie');
	return cookie;
}

async function connect(baseURL: string, code: string, name: string): Promise<Bot> {
	const token = await mintToken(baseURL);
	const url = new URL(`/api/room/${code}/ws`, baseURL);
	url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
	url.searchParams.set('t', token);
	url.searchParams.set('name', name);

	const socket = new WebSocket(url);
	const bot: Bot = {
		name,
		id: '',
		state: null,
		own: null,
		send: (message) => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(message)),
		close: () => socket.close()
	};

	socket.addEventListener('message', (event) => {
		const message = JSON.parse(String(event.data)) as ServerMessage;
		if (message.type !== 'state') return;
		bot.state = message.state;
		bot.own = message.private;
		bot.id = message.you;
	});

	await new Promise<void>((resolve, reject) => {
		socket.addEventListener('open', () => resolve());
		socket.addEventListener('error', () => reject(new Error(`bot ${name} could not connect`)));
	});
	return bot;
}

export type Table = {
	code: string;
	bots: Bot[];
	/** Stop playing along and disconnect. Always call this. */
	close: () => void;
};

/**
 * Seat `count` bots in a new room and have them play their part: ready up,
 * settle on an article, finish reading, and — when the chair lands on one of
 * them — pick whoever is not a bot, so the browser gets the next turn.
 */
export async function seatBots(baseURL: string, code: string, count = 2): Promise<Table> {
	const names = ['Ada Bot', 'Brendan Bot', 'Cleo Bot', 'Dara Bot'].slice(0, count);
	const bots: Bot[] = [];
	for (const name of names) bots.push(await connect(baseURL, code, name));

	for (const bot of bots) bot.send({ type: 'set-ready', ready: true });

	let acted = '';
	const tick = setInterval(() => {
		const state = bots[0]?.state;
		if (!state) return;
		const key = `${state.stage}:${state.round}`;
		const ours = new Set(bots.map((bot) => bot.id));

		if (state.stage === 'picking' && acted !== key) {
			const mine = bots.filter((bot) => bot.id !== state.guesserId);
			if (mine.every((bot) => bot.own?.candidate)) {
				for (const bot of mine) bot.send({ type: 'lock-in' });
				acted = key;
			}
		}
		if (state.stage === 'reading' && acted !== key) {
			for (const bot of bots) {
				if (bot.id !== state.guesserId) bot.send({ type: 'done-reading' });
			}
			acted = key;
		}
		if (state.stage === 'questioning' && acted !== key) {
			const chair = bots.find((bot) => bot.id === state.guesserId);
			const human = state.players.find((p) => !ours.has(p.id) && p.id !== state.guesserId);
			if (chair && human) {
				chair.send({ type: 'guess', playerId: human.id });
				acted = key;
			}
		}
	}, 300);

	return {
		code,
		bots,
		close: () => {
			clearInterval(tick);
			for (const bot of bots) bot.close();
		}
	};
}
