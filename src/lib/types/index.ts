export interface Room {
    host: User; // User ID of host
    members: MemberMap[]; // all members, including host
    avatars: Avatar[]; // available, unreserved avatars
};

export interface RoomsMap {
    [index: RoomID]: Room;
};

export interface MemberMap {
    user: User;
    avatar: Avatar;
}

export interface MinioObject {
    rooms: RoomsMap;
};

export type User = string
export type Avatar = string
export type RoomID = string