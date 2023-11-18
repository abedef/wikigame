import PocketBase from "pocketbase";
import { Server, Socket, type ServerOptions } from "socket.io";
import {
  SocketEvent,
  type Article,
  type Player,
  type PlayerID,
  type Room,
  type RoomID,
  Stage,
} from ".";

const env = { PUBLIC_POCKETBASE_URL: "http://100.77.33.133:8088" };

const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);
pb.autoCancellation(false);
const roomsPB = pb.collection<Room>("rooms");
const playersPB = pb.collection<Player>("players");
const articlesPB = pb.collection<Article>("articles");

/** The minimum acceptable number of players in any given room. */
const MIN_PLAYERS = 3;

/** The maximum acceptable number of players in any given room. */
const MAX_PLAYERS = 12;

/** The number of articles each player should be allowed to view before making a selection. */
const ARTICLES_PER_PLAYER = 10;

/** Returns a random element of `arr`. */
const getRandomElement = (arr: any[]) =>
  arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;

/**
 * Creates and returns a new player.
 * @param name the new player's name (optional)
 * @returns a new player
 */
export async function createPlayer(name?: PlayerID) {
  if (!name) return await playersPB.create({});
  return await playersPB.create({ name });
}

/**
 * Checks if there exists a player with the given `id` and returns it.
 * If none exist, returns `undefined`.
 * @param id the `id` of an existing player
 * @returns an existing player with the same `id`, or `undefined`
 */
export async function getPlayer(id?: PlayerID) {
  if (!id) return undefined;
  return await playersPB
    .getOne(id, { expand: "room,articles" })
    .catch(() => undefined);
}

/**
 * Fetches a random set of articles (titles and URLs).
 * @param quantity number of articles to return
 * @returns a randomized list of articles
 */
async function getRandomArticles(quantity: number) {
  const results = await articlesPB.getList(1, quantity, { sort: "@random" });
  console.info(
    `! retrieved ${results.items.length} of ${results.totalItems} articles`
  );
  return results.items;
}

/** Creates a room with a random room code and returns its details. */
async function createRoom() {
  let roomCode: string;

  do roomCode = `${10000 + Math.floor(Math.random() * 90000)}`;
  while (await getRoomByCode(roomCode));

  return await roomsPB.create({ code: roomCode });
}

/** Returns the corresponding `Room`, if it exists. */
async function getRoom(id: RoomID) {
  return await roomsPB
    .getOne(id, {
      expand:
        "players,guessee,guesser,players.articles,players.article,guessee.article",
    })
    .catch(() => undefined);
}

/** Returns the `Room` corresponding to the given code, if it exists. */
async function getRoomByCode(code: string) {
  return await roomsPB
    .getFirstListItem(`code = "${code}"`, {
      expand:
        "players,guessee,guesser,players.articles,players.article,guessee.article",
    })
    .catch(() => undefined);
}

async function startGame(socket: Socket, id: PlayerID, roomID: RoomID) {
  const player = await getPlayer(id);
  if (!player) {
    socket.emit(SocketEvent.Error, `Couldn't start game: (invalid player)`);
    return;
  }
  if (!player.room) {
    socket.emit(SocketEvent.Error, `Couldn't start game: (not in a room)`);
    return;
  }
  const room = await getRoom(roomID);
  if (!room) {
    socket.emit(SocketEvent.Error, `Couldn't find room: (${roomID})`);
    return;
  }
  // const articles = await getRandomArticles(
  //   room.players.length * ARTICLES_PER_PLAYER
  // );

  // Initialize each player's status
  // room.expand?.players
  //   .filter((player) => player.article && player.article.length > 0)
  //   .forEach((player) =>
  //     playersPB.update(player.id, {
  //       article: articles.splice(0, 1).map((article) => article.id),
  //       articles: articles
  //         .splice(0, ARTICLES_PER_PLAYER - 1)
  //         .map((article) => article.id),
  //     })
  //   );
  await roomsPB.update(room.id, {
    stage: Stage.Researching,
    guessee: getRandomElement(
      room.players.filter((id) => id !== room.guesser && id != room.guessee)
    ),
  });

  socket.to(player.room).emit(SocketEvent.Update, await getRoom(room.id));
  socket.emit(SocketEvent.Update, await getRoom(room.id));
}

/**
 * Hosts and joins room as the provided user.
 * @param id user to add to the room
 */
async function hostRoom(socket: Socket, id: PlayerID) {
  const room = await createRoom();
  const player = await getPlayer(id);
  if (!player) {
    socket.emit(SocketEvent.Error, `Couldn't host game: (invalid player)`);
    return;
  }
  console.log(`• ${player.name} (${id}) created room ${room.id}`);
  if (player.room) await leaveRoom(socket, id);
  await joinRoom(socket, id, room.id);
}

/** Joins a given player to a room by code. If no code is provided, tries to join the room that is listed on the `Player`'s record. */
async function joinRoomByCode(socket: Socket, id: PlayerID, code?: string) {
  const player = await getPlayer(id);
  if (!player) {
    socket.emit(SocketEvent.Error, `Couldn't join room: (invalid player)`);
    return;
  }
  code = code ?? player.expand?.room.code;
  if (!code) return;
  const room = await getRoomByCode(code);
  if (!room) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't find room ${code}: (invalid code)`
    );
    return;
  }

  await joinRoom(socket, id, room.id);
}

/** Renames player with given `id` to new `name`, then updates others in the same room. */
async function renamePlayer(socket: Socket, id: PlayerID, name: string) {
  await playersPB
    .update(id, { name })
    .catch(() => console.error(`! Couldn't rename ${id} to ${name}`));

  const player = await getPlayer(id);
  if (player && player.room) {
    socket.to(player.room).emit(SocketEvent.Update, await getRoom(player.room));
    socket.emit(SocketEvent.Update, await getRoom(player.room));
  }
}

/**
 * Joins user to the room with the provided ID as a non-host.
 *
 * @param id user to add to the room
 * @param roomID the room to add the user to
 */
async function joinRoom(socket: Socket, id: PlayerID, roomID: RoomID) {
  const player = await getPlayer(id);
  if (!player) {
    socket.emit(SocketEvent.Error, `Couldn't join game: (invalid player)`);
    return;
  }

  if (player.room && player.room !== roomID) await leaveRoom(socket, id);

  const room = await getRoom(roomID);
  if (!room) {
    socket.emit(SocketEvent.Error, `Couldn't join room ${roomID} (invalid id)`);
    return;
  }

  if (room.players.length >= MAX_PLAYERS) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't join room ${room.code} (room full)`
    );
    return;
  }

  if (room.stage > 0 && !room.players.includes(id)) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't join room ${room.code} (game is already in progress)`
    );
    return;
  }

  if (!room.players.includes(id)) {
    await roomsPB.update(room.id, {
      players: [id, ...room.players],
      guesser: room.guesser === "" ? id : room.guesser,
    });
    const articles = await getRandomArticles(ARTICLES_PER_PLAYER);
    await playersPB.update(player.id, {
      room: room.id,
      articles: articles.splice(1).map((article) => article.id),
      article: articles.at(0)?.id,
    });
  }

  await socket.join([id, roomID]);

  // TODO Delete other fields that shouldn't be there
  // delete room.guessee;
  // room.expand?.players
  //   .filter((player) => player.id !== user)
  //   .forEach((player) => delete player.article);

  socket.to(roomID).emit(SocketEvent.Update, await getRoom(roomID));
  socket.emit(SocketEvent.Update, await getRoom(roomID));
}

async function kickFromRoom(server: Server, id: PlayerID) {
  const player = await getPlayer(id);
  if (!player || !player.room || !player.expand?.room.code) return;
  await playersPB.update(id, {
    score: 0,
    article: "",
    articles: [],
    room: "",
  });
  server.in(player.id).socketsLeave(player.room);

  const players =
    player.expand?.room.players.filter((id) => id !== player.id) ?? [];
  const guesser = player.expand?.room.guesser;
  const guessee = player.expand?.room.guessee;

  if (player.id === guesser) {
    // Change the guesser, easy
    await roomsPB.update(player.room, {
      players,
      guesser: getRandomElement(players.filter((id) => id !== guessee)),
    });
  } else if (player.id === guessee) {
    // Change the current topic, easy but sucks
    await roomsPB.update(player.room, {
      players,
      guessee: getRandomElement(players.filter((id) => id !== guesser)),
    });
  } else {
    // Nothing changes really
    await roomsPB.update(player.room, { players });
  }

  if (players.length < MIN_PLAYERS) {
    // end game?
    // Tell everyone to leave
  }

  server.to(player.room).emit(SocketEvent.Update, await getRoom(player.room));
  server.to(player.id).emit(SocketEvent.Update, undefined);
}

async function makeGuess(socket: Socket, id: PlayerID) {
  const player = await getPlayer(id);
  if (!player || !player.room) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't guess player ${id} (invalid player)`
    );
    return;
  }

  if (id === player.expand?.room.guessee) {
    // If the guess is correct, guesser + guessee get 1 point each
    const guesser = await getPlayer(player.expand.room.guesser);
    if (!guesser) {
      socket.emit(
        SocketEvent.Error,
        `Couldn't award points to guesser ${player.expand.room.guesser} (invalid player)`
      );
      return;
    }
    await playersPB.update(player.id, {
      score: player.score + 1,
      article: "",
    });
    await playersPB.update(guesser.id, {
      score: guesser.score + 1,
    });
  } else {
    await playersPB.update(player.id, {
      score: player.score + 2,
    });
    const guessee = await getPlayer(player.expand?.room.guessee);
    if (!guessee) {
      socket.emit(
        SocketEvent.Error,
        `Couldn't clear article from guessee ${player.expand?.room.guessee} (invalid player)`
      );
      return;
    }
    await playersPB.update(guessee.id, {
      article: "",
    });
  }

  if (!player.expand?.room.guesser) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't assign new articles to guesser ${player.expand?.room.guesser} (invalid player)`
    );
    return;
  }
  const articles = await getRandomArticles(ARTICLES_PER_PLAYER);
  await playersPB.update(player.expand?.room.guesser, {
    articles: articles.splice(1).map((article) => article.id),
    article: articles.at(0)?.id,
  });

  await roomsPB.update(player.room, {
    stage: Stage.Lobby,
    guesser: player.expand?.room.guessee,
  });

  socket.to(player.room).emit(SocketEvent.Update, await getRoom(player.room));
  socket.emit(SocketEvent.Update, await getRoom(player.room));
}

async function skipArticleForPlayer(socket: Socket, id: PlayerID) {
  const player = await getPlayer(id);
  if (!player || !player.room) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't skip article for player ${id} (invalid player)`
    );
    return;
  }

  if (!player.articles || player.articles?.length === 0) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't skip article for player ${id} (no remaining articles)`
    );
    return;
  }

  await playersPB.update(id, {
    articles: player.articles.splice(1),
    article: player.articles.at(0),
  });

  socket.emit(SocketEvent.Update, await getRoom(player.room));
}

async function lockIn(socket: Socket, id: RoomID) {
  const room = await getRoom(id);
  if (!room) {
    socket.emit(
      SocketEvent.Error,
      `Couldn't lock in room ${id} (invalid room)`
    );
    return;
  }
  await roomsPB.update(room.id, { stage: Stage.Guessing });
  room.expand?.players.forEach((player) =>
    playersPB.update(player.id, { articles: [] })
  );

  socket.to(id).emit(SocketEvent.Update, await getRoom(id));
  socket.emit(SocketEvent.Update, await getRoom(id));
}

async function leaveRoom(socket: Socket, id: PlayerID) {
  const player = await getPlayer(id);
  if (!player || !player.room || !player.expand?.room.code) return;
  await playersPB.update(id, {
    score: 0,
    article: "",
    articles: [],
    room: "",
  });
  await socket.leave(player.room);

  const players =
    player.expand?.room.players.filter((id) => id !== player.id) ?? [];
  const guesser = player.expand?.room.guesser;
  const guessee = player.expand?.room.guessee;

  if (player.id === guesser) {
    // Change the guesser, easy
    await roomsPB.update(player.room, {
      players,
      guesser: getRandomElement(players.filter((id) => id !== guessee)),
    });
  } else if (player.id === guessee) {
    // Change the current topic, easy but sucks
    await roomsPB.update(player.room, {
      players,
      guessee: getRandomElement(players.filter((id) => id !== guesser)),
    });
  } else {
    // Nothing changes really
    await roomsPB.update(player.room, { players });
  }

  if (players.length < MIN_PLAYERS) {
    // end game?
    // Tell everyone to leave
  }

  socket.to(player.room).emit(SocketEvent.Update, await getRoom(player.room));
  socket.emit(SocketEvent.Update, undefined);
}

export default {
  name: "webSocketServer",
  configureServer(
    /* TODO What type is `server`? see vite docs */
    server: { httpServer: Partial<ServerOptions> }
  ) {
    const io = new Server(server.httpServer);
    io.on(SocketEvent.Connection, (socket) => {
      console.info(`✶ [${socket.id}] ${SocketEvent.Connection}`);

      socket.prependAnyOutgoing((event, ...args) =>
        console.info(`⤴️ [${socket.id}] ${event}`, args)
      );
      socket.prependAny((event, ...args) => {
        console.info(`⤵️ [${socket.id}] ${event}`, args);
      });

      socket.on(
        SocketEvent.LockIn,
        async (id: RoomID) => await lockIn(socket, id)
      );

      socket.on(
        SocketEvent.SkipArticle,
        async (id: PlayerID) => await skipArticleForPlayer(socket, id)
      );

      socket.on(
        SocketEvent.Guess,
        async (id: PlayerID) => await makeGuess(socket, id)
      );

      socket.on(
        SocketEvent.Update,
        async (id: PlayerID, name: string) =>
          await renamePlayer(socket, id, name)
      );

      socket.on(
        SocketEvent.Host,
        async (id: PlayerID) => await hostRoom(socket, id)
      );

      socket.on(
        SocketEvent.Join,
        async (id: PlayerID, code?: string) =>
          await joinRoomByCode(socket, id, code)
      );

      socket.on(
        SocketEvent.Start,
        async (id: string, roomID: string) =>
          await startGame(socket, id, roomID)
      );

      // Remember this is called when someone explicity leaves a room or joins another – the disconnect event is different
      socket.on(
        SocketEvent.Leave,
        async (id: PlayerID) => await leaveRoom(socket, id)
      );

      // Remember this is called when someone explicity leaves a room or joins another – the disconnect event is different
      socket.on(
        SocketEvent.Kick,
        async (id: PlayerID) => await kickFromRoom(io, id)
      );

      // Note that this event is not treated as a "leave" event is treated
      // since we cannot be sure it is an explicit intent to leave.
      socket.on(SocketEvent.Disconnect, async (reason) => {
        console.info(`× [${socket.id}] ${SocketEvent.Disconnect} ${reason}`);
      });
    });
  },
};
