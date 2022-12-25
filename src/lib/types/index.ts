import type { GameStage } from "$lib/enums";

export type GameConfig = {
  size: 3 | 4 | 5 | 6 | 7 | 8;
  rounds: 3 | 5 | 8 | 0; // 0 is infinite, "party mode"
};

export type Article = {
    url: string,
    title: string,
}

export type GameState = {
    guesserID?: string;
    truthTellerID?: string;
    liarIDs?: string[];
    score: {
        [userID: string]: number
    };
    articlePool: {
        [userID: string]: Article
    };
    activeArticle?: Article;
    stage: GameStage;
    round: number;
}

export type Room = {
    hostID: string; // User ID of host
    members: User[]; // all members, including host
    avatars: Avatar[]; // available, unreserved avatars
    config: GameConfig; // room size and # of rounds
    gameState: GameState; // holds all game state
};

export type RoomsMap = {
    [index: RoomID]: Room;
};

export type MinioObject = {
    rooms: RoomsMap;
};

export type User = {
    id: string;
    avatar: string;
    name?: string; // TODO: implement
};

export type Avatar = string;
export type RoomID = string;