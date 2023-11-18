export enum SocketEvent {
  Connection = "connection",
  Disconnect = "disconnect",
  Host = "host",
  Join = "join",
  Start = "start",
  LockIn = "lockin",
  Guess = "guess",
  SkipArticle = "skipArticle",
  Leave = "leave",
  Kick = "kick",
  Error = "error",
  Update = "update",
}

export enum Stage {
  Lobby = 0,
  Researching = 1,
  Guessing = 2,
}

export type Article = {
  id: ArticleID;
  url: string;
  title: string;
};

export type Room = {
  id: RoomID;
  code: string;
  expand?: {
    players: Player[];
    guessee?: Player;
    guesser?: Player;
  };
  players: PlayerID[];
  guessee?: PlayerID;

  /**
   * Somewhat synonymous with "host" – the player
   * who has special permissions for managing the
   * flow of the current round (i.e. advancing stages
   * and making guesses).
   */
  guesser?: PlayerID;
  stage: number;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  article?: ArticleID;
  articles?: ArticleID[];
  room?: RoomID;
  expand?: {
    room: Room;
    article: Article;
    articles: Article[];
  };
};

export type ArticleID = string;
export type PlayerID = string;
export type RoomID = string;
