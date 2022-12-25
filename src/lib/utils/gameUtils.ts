import { GameStage } from "$lib/enums";
import type { Article, GameState, Room, User } from "$lib/types";
import { getRoom } from "./roomUtils";

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
        if (Object.keys(room.gameState.articlePool).length < room.members.length - 1) {
            console.log('Cannot advance');
            break;
        }
        // articles selected
        // choose random article and assign roles
        const playerIDs = Object.keys(room.gameState.articlePool);
        const truthTellerID = playerIDs[Math.floor(Math.random() * playerIDs.length)];
        room.gameState.truthTellerID = truthTellerID;
        room.gameState.liarIDs = playerIDs.filter(player => player !== truthTellerID);
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
        if (room.gameState.truthTellerID) delete room.gameState.articlePool[room.gameState.truthTellerID];
        room.gameState.truthTellerID = undefined;
        if (room.gameState.round > room.config.rounds) {
            endGame(room);
        }
        break;
  }
  console.log(room);
  return room.gameState.stage;
};

export function startGame(roomID: string) {
    const room = getRoom(roomID);
    if (room === undefined) {
        return; // TODO handle
    }
    room.gameState.round = 1;
    room.gameState.guesserID = room.hostID;
    room.members.forEach(member => room.gameState.score[member.id] = 0)
    console.log(room);
};

export function selectArticle(user: User, article: Article, roomID: string): GameStage {
    // add article to pool
    const room = getRoom(roomID);
    if (room === undefined) {
        return GameStage.Guessing; // TODO handle
    }
    let stage = room.gameState.stage;
    room.gameState.articlePool[user.id] = article;
    // once we have members.length - 1 articles, advance to next stage 
    if (Object.keys(room.gameState.articlePool).length = room.members.length - 1) {
        stage = advanceStage(room);
    }
    console.log(room);
    return stage;
};

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
};

export function endGame(room: Room) {
    // show users scores
    // reset game state
    room.gameState = DEFAULT_GAME_STATE;
    // reset state.state to Hosting or Joined
};

export function getScores(roomID: string) {
    const room = getRoom(roomID);
    if (room === undefined) {
        return {}; // TODO handle
    }
    return room.gameState.score;
};

export function getUserArticle(roomID: string, userID: string): Article | undefined {
    const room = getRoom(roomID);
    if (room === undefined) {
        return; // TODO handle
    }
    return room.gameState.articlePool[userID];
};

export function getActiveArticleTitle(roomID: string): string | undefined {
    const room = getRoom(roomID);
    if (room === undefined) {
        return; // TODO handle
    }
    return room.gameState.activeArticle?.title;
};