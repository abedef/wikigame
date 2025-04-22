// place files you want to import through the `$lib` alias in this folder.

import PocketBase from 'pocketbase';

const pb = new PocketBase('https://pocketbase.genieindex.ca');

export enum Stage {
	PREGAME,
	READING,
	GUESSING
}

type RoomID = string;
type PlayerID = string;
type ArticleID = string;

export type Article = {
	id: ArticleID;
	title: string;
	url: string;
};

export type Room = {
	id: RoomID;
	code: string;
	players: Player['id'][];
	guesser?: Player['id'];
	guessee?: Player['id'];
	stage: Stage;
	expand: {
		players: Player[];
		guesser?: Player;
		guessee?: Player;
	};
};

export type Player = {
	id: PlayerID;
	name: string;
	room: Room['id'] | undefined;
	score: number;
	article: Article['id'];
	articles: Player['article'][];
	expand: {
		room: Room;
		article: Article;
		articles: Player['expand']['article'][];
	};
};

export async function joinRoomByCode(id: Player['id'], code: Room['code']): Promise<Room | null> {
	try {
		const room = await pb
			.collection<Room>('rooms')
			.getFirstListItem(`code = "${code}"`, { expand: 'players' });
		const player = await pb.collection<Player>('players').getOne(id);

		player.room = room.id;
		await pb.collection<Player>('players').update(id, player);

		if (room.players.includes(id)) return room;
		room.players.push(id);
		if (!room.guesser || !room.players.includes(room.guesser)) room.guesser = id;

		const updatedRoom = await pb
			.collection<Room>('rooms')
			.update(room.id, room, { expand: 'players' });
		return updatedRoom;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function getRoomByCode(code: string): Promise<Room | null> {
	try {
		const room = await pb
			.collection<Room>('rooms')
			.getFirstListItem(`code = "${code}"`, { expand: 'players' });
		return room;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function getPlayerByIdentifier(id: string): Promise<Player | null> {
	try {
		const player = await pb.collection<Player>('players').getOne(id);
		return player;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function getRoomByIdentifier(id: string): Promise<Room | null> {
	try {
		const room = await pb.collection<Room>('rooms').getOne(id, { expand: 'players' });
		return room;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function createRoom(): Promise<Room | null> {
	try {
		const room = await pb.collection<Room>('rooms').create();
		return room;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function createPlayer(): Promise<Player | null> {
	try {
		const player = await pb.collection<Player>('players').create();
		return player;
	} catch (error) {
		console.error(error);
		return null;
	}
}
