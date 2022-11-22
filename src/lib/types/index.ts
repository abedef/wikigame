export type Room = {
    hostID: string; // User ID of host
    members: User[]; // all members, including host
    avatars: Avatar[]; // available, unreserved avatars
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
}

export type Avatar = string
export type RoomID = string