import type { Avatar, MinioObject, Room, RoomID, RoomsMap, User } from "$lib/types";
import { AVATARS } from "./avatarUtils";
import { isUserRegistered } from "./userUtils";
import {
    configure,
    putObject,
    getObject,
} from "@genieindex/miniojs";
import { MINIO_ENDPOINT, MINIO_ACCESS_ID, MINIO_ACCESS_KEY } from '../secrets'


async function importRoomState(): Promise<RoomsMap> {
    configure(
        MINIO_ENDPOINT,
        true,
        MINIO_ACCESS_ID,
        MINIO_ACCESS_KEY
    );

    console.log("Trying to retrieve room state...");
    getObject("lietome").then(
        (obj: MinioObject) => {
            console.log(`imported rooms ${JSON.stringify(obj.rooms)}`);
            return obj.rooms;
        }).catch(
            // TODO what is the type of err? see minio docs
            (err: {}) => {
                console.log(`error getting object: ${err}`);
                exportRoomState(rooms || {});
            },
        );
    return {}
}
const rooms: RoomsMap = await importRoomState();

export function getRoomState(): RoomsMap { return rooms }

export async function exportRoomState(rooms: RoomsMap) {
    configure(
        MINIO_ENDPOINT,
        true,
        MINIO_ACCESS_ID,
        MINIO_ACCESS_KEY
    );
    putObject("lietome", {
        rooms,
    });
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
 * Calling this function when the user is already in the room is harmless.
 * @param user user to add to the room
 * @param roomID the room to add the user to
 * @returns the avatar assigned to this user
 */
 export function joinRoom(user: User, roomID: RoomID): Avatar {
    const room = rooms[roomID];
    if (isUserRegistered(user, room)) {
        return room.members.reduce((prev, curr) => {
            if (curr.user === user) {
                prev = curr.avatar;
            }
            return prev;
        }, '⁇');
    }

    let avatar = room.avatars.pop() ?? "⁇";
    room.members.push({ avatar, user });

    return avatar;
}

export function createRoom(user: User): { roomID: RoomID, room: Room } {
    let room: RoomID;
    do {
        room = `${10000 + Math.floor(Math.random() * 90000)}`;
    } while (room in rooms);

    rooms[room] = {
        host: user,
        members: [],
        avatars: [...AVATARS],
    };

    joinRoom(user, room);

    exportRoomState(rooms);

    return { roomID: room, room: rooms[room] };
}