export enum State {
    None,
    Registering,
    Joining,
    Joined,
    Hosting,
    Playing,
};

export enum GameStage {
    Research,
    Questioning,
    Guessing,
    EndRound,
}

export enum SocketEvent {
    Connection = "connection",
    Host = "host",
    Join = "join",
    Joined = "joined",
    Start = "start",
    Started = "started",
    AdvanceStage = "advanceStage",
    Advance = "advance",
    SelectArticle = "selectArticle",
    Leave = "leave",
    Disconnect = "disconnect",
    Error = "error",
    Members = "members",
    Room = "room",
    Reintroduce = "reintroduce",
    Greet = "greet",
  }
  