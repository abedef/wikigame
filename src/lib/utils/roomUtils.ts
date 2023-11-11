import type {
    Avatar,
    GameConfig, Room,
    RoomID,
    RoomsMap,
    User
} from "../types";
import {
    AVATARS,
    DEFAULT_AVATAR,
    getRandomAvatar,
    getRandomFromArray,
} from "./avatarUtils";
import { getUserInRoom } from "./userUtils";
import { DEFAULT_GAME_STATE } from "./gameUtils";
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);

async function importRoomState(): Promise<RoomsMap> {
    console.log("Trying to retrieve room state...");
    const record = await pb.collection<{rooms:RoomsMap}>('state').getOne('903tiw5dqajwo6n');
    return record.rooms;

    // I did this initially to set up the object in the db
    // exportRoomState(rooms || {});
}

const rooms: RoomsMap = await importRoomState();

export function getRoomState(): RoomsMap { return rooms };
export function getRoom(roomID: string): Room | undefined { return rooms[roomID] };
export function getRoomHost(roomID: string): User | undefined { return rooms[roomID].members.find(u => u.id === rooms[roomID].hostID)}

export async function exportRoomState(rooms: RoomsMap) {
    await pb.collection('state').update('903tiw5dqajwo6n', {rooms});
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
    const matchingUserInRoom = getUserInRoom(user.id, room)
    if (matchingUserInRoom !== undefined) {
        return matchingUserInRoom.avatar
    }

    let [randomAvailableAvatar, index] = getRandomFromArray(room.avatars);
    if (randomAvailableAvatar) {
        // remove from available list
        room.avatars.splice(index, 1)
    } else {
        randomAvailableAvatar = DEFAULT_AVATAR
    }
    room.members.push(user);

    return randomAvailableAvatar;
}

/**
 * Create a room and set the provided user as host.
 * @param user user who will be the host
 * @returns an object containing the new roomID and the Room itself
 */
export function createRoom(user: User, options?: GameConfig): { roomID: RoomID, room: Room } {
    let roomID: RoomID;
    do {
        roomID = `${10000 + Math.floor(Math.random() * 90000)}`;
    } while (roomID in rooms);

    const [randomAvatar, index] = getRandomAvatar();
    user.avatar = randomAvatar;

    const avatars = [...AVATARS]
    avatars.splice(index, 1)

    rooms[roomID] = {
        hostID: user.id,
        members: [user],
        avatars: avatars, // list of AVATARS minus avatar from host
        config: {
            size: 8,
            rounds: 8,
            ...options
        },
        gameState: DEFAULT_GAME_STATE,
    };

    exportRoomState(rooms);

    return { roomID, room: rooms[roomID] };
}