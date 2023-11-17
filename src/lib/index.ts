export enum SocketEvent {
  Connection = "connection",
  Disconnect = "disconnect",
  Host = "host",
  Join = "join",
  Start = "start",
  LockIn = "lockin",
  Guess = "guess",
  SelectArticle = "selectArticle",
  Leave = "leave",
  Kick = "kick",
  Error = "error",
  Update = "update",
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
  guessee: PlayerID | undefined;

  /**
   * Somewhat synonymous with "host" – the player
   * who has special permissions for managing the
   * flow of the current round (i.e. advancing stages
   * and making guesses).
   */
  guesser: PlayerID | undefined;
  round: number;
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
