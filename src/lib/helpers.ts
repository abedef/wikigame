export const AVATARS = [
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐻",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐔",
  "🐧",
  "🐦",
  "🐤",
  "🐙",
];

export const DEFAULT_AVATAR = "❓";

/**
 * Get a random T from an array of T and the index of said T in T[]
 * @param arr an array of type T
 * @returns [
 *   T: the item
 *   number: the index of T in T[]
 * ]
 */
export function getRandomFromArray<T>(arr: T[]): [T | undefined, number] {
  const index = Math.floor(Math.random() * arr.length);
  return [arr[index], index];
}

/**
 * Get a random avatar from AVATARS and the index of said avatar in AVATARS
 * @returns [
 *   string: the avatar
 *   number: the index of the avatar in AVATARS
 * ]
 */
export function getRandomAvatar(): [string, number] {
  const [avatar, index] = getRandomFromArray(AVATARS);
  return [avatar || DEFAULT_AVATAR, index];
}

import { GameStage } from "./enums";
import type { Article, GameState } from "./types";

export const DEFAULT_GAME_STATE: GameState = {
  stage: GameStage.Research,
  round: 0,
  score: {},
  articlePool: {},
};

export function advanceStage(room: Room): GameStage {
  switch (room.gameState.stage) {
    case GameStage.Research:
      // if we dont have enough articles, don't advance
      if (
        Object.keys(room.gameState.articlePool).length <
        room.members.length - 1
      ) {
        console.log("Cannot advance");
        break;
      }
      // articles selected
      // choose random article and assign roles
      const playerIDs = Object.keys(room.gameState.articlePool);
      const truthTellerID =
        playerIDs[Math.floor(Math.random() * playerIDs.length)];
      room.gameState.truthTellerID = truthTellerID;
      room.gameState.liarIDs = playerIDs.filter(
        (player) => player !== truthTellerID
      );
      room.gameState.activeArticle = room.gameState.articlePool[truthTellerID];
      room.gameState.stage = GameStage.Questioning;
      break;
    case GameStage.Questioning:
      room.gameState.stage = GameStage.Guessing;
      break;
    case GameStage.Guessing:
      room.gameState.stage = GameStage.EndRound;
      break;
    case GameStage.EndRound:
      room.gameState.stage = GameStage.Research;
      room.gameState.round++;
      room.gameState.liarIDs = [];
      room.gameState.guesserID = room.gameState.truthTellerID;
      if (room.gameState.truthTellerID)
        delete room.gameState.articlePool[room.gameState.truthTellerID];
      room.gameState.truthTellerID = undefined;
      if (room.gameState.round > room.config.rounds) {
        endGame(room);
      }
      break;
  }
  console.log(room);
  return room.gameState.stage;
}

export function startGame(roomID: string) {
  const room = getRoom(roomID);
  if (room === undefined) {
    return; // TODO handle
  }
  room.gameState.round = 1;
  room.gameState.guesserID = room.hostID;
  room.members.forEach((member) => (room.gameState.score[member.id] = 0));
  console.log(room);
}

export function selectArticle(
  user: User,
  article: Article,
  roomID: string
): GameStage {
  // add article to pool
  const room = getRoom(roomID);
  if (room === undefined) {
    return GameStage.Guessing; // TODO handle
  }
  let stage = room.gameState.stage;
  room.gameState.articlePool[user.id] = article;
  // once we have members.length - 1 articles, advance to next stage
  if (
    (Object.keys(room.gameState.articlePool).length = room.members.length - 1)
  ) {
    stage = advanceStage(room);
  }
  console.log(room);
  return stage;
}

export function makeGuess(roomID: string, guessID: string) {
  const room = getRoom(roomID);
  if (room === undefined) {
    return; // TODO handle
  }
  // determine if guess was correct and score
  const truthTellerID = room.gameState.truthTellerID;
  const guesserID = room.gameState.guesserID;
  let guessIsCorrect = false;
  if (truthTellerID && guesserID && guessID === truthTellerID) {
    room.gameState.score[guesserID]++;
    room.gameState.score[truthTellerID]++;
    guessIsCorrect = true;
  } else {
    room.gameState.score[guessID]++;
  }
  // let users know a guess was made and if it was wrong or right
  // advance stage
  advanceStage(room);
}

export function endGame(room: Room) {
  // show users scores
  // reset game state
  room.gameState = DEFAULT_GAME_STATE;
  // reset state.state to Hosting or Joined
}

export function getScores(roomID: string) {
  const room = getRoom(roomID);
  if (room === undefined) {
    return {}; // TODO handle
  }
  return room.gameState.score;
}

export function getUserArticle(
  roomID: string,
  userID: string
): Article | undefined {
  const room = getRoom(roomID);
  if (room === undefined) {
    return; // TODO handle
  }
  return room.gameState.articlePool[userID];
}

export function getActiveArticleTitle(roomID: string): string | undefined {
  const room = getRoom(roomID);
  if (room === undefined) {
    return; // TODO handle
  }
  return room.gameState.activeArticle?.title;
}

import PocketBase from "pocketbase";
import type { Avatar, GameConfig, Room, RoomID, RoomsMap, User } from "./types";

const env = { PUBLIC_POCKETBASE_URL: "http://100.77.33.133:8088" };

const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);

async function importRoomState(): Promise<RoomsMap> {
  console.log("Trying to retrieve room state...");
  const record = await pb
    .collection<{ rooms: RoomsMap }>("state")
    .getOne("903tiw5dqajwo6n");
  return record.rooms;

  // I did this initially to set up the object in the db
  // exportRoomState(rooms || {});
}

const rooms: RoomsMap = await importRoomState();

export function getRoomState(): RoomsMap {
  return rooms;
}
export function getRoom(roomID: string): Room | undefined {
  return rooms[roomID];
}
export function getRoomHost(roomID: string): User | undefined {
  return rooms[roomID].members.find((u) => u.id === rooms[roomID].hostID);
}

export async function exportRoomState(rooms: RoomsMap) {
  await pb.collection("state").update("903tiw5dqajwo6n", { rooms });
}

/**
 * Returns all the used avatars (i.e. member list) in the provided room.
 * @param room the room for which to return the avatars
 * @returns all used avatars in that room
 */
export function getAvatars(room: Room): Avatar[] {
  return room.members.map(({ avatar }) => avatar);
}

/**
 * Joins user to the room with the provided ID as a non-host.
 * Calling this function when the user is already in the room provides the user with
 * the same avatar they had the last time they were in the room without leaving.
 *
 * @param user user to add to the room
 * @param roomID the room to add the user to
 * @returns the avatar assigned to this user
 */
export function joinRoom(user: User, roomID: RoomID): Avatar {
  const room = rooms[roomID];
  const matchingUserInRoom = getUserInRoom(user.id, room);
  if (matchingUserInRoom !== undefined) {
    return matchingUserInRoom.avatar;
  }

  let [randomAvailableAvatar, index] = getRandomFromArray(room.avatars);
  if (randomAvailableAvatar) {
    // remove from available list
    room.avatars.splice(index, 1);
  } else {
    randomAvailableAvatar = DEFAULT_AVATAR;
  }
  room.members.push(user);

  return randomAvailableAvatar;
}

/**
 * Create a room and set the provided user as host.
 * @param user user who will be the host
 * @returns an object containing the new roomID and the Room itself
 */
export function createRoom(
  user: User,
  options?: GameConfig
): { roomID: RoomID; room: Room } {
  let roomID: RoomID;
  do {
    roomID = `${10000 + Math.floor(Math.random() * 90000)}`;
  } while (roomID in rooms);

  const [randomAvatar, index] = getRandomAvatar();
  user.avatar = randomAvatar;

  const avatars = [...AVATARS];
  avatars.splice(index, 1);

  rooms[roomID] = {
    hostID: user.id,
    members: [user],
    avatars: avatars, // list of AVATARS minus avatar from host
    config: {
      size: 8,
      rounds: 8,
      ...options,
    },
    gameState: DEFAULT_GAME_STATE,
  };

  exportRoomState(rooms);

  return { roomID, room: rooms[roomID] };
}

/**
 * Checks whether or not user belongs to a room. If true, return the user, if false, return undefined
 * @param userID the user's session ID
 * @returns User if the user is registered, undefined if not
 */
export function getUserInRoom(userID: string, room: Room): User | undefined {
  return room.members.find((member) => member.id === userID);
}

export function createUser(session: string): User {
  return {
    id: session,
    avatar: DEFAULT_AVATAR,
  };
}
