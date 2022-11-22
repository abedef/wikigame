import type { Room, User } from "$lib/types";
import { DEFAULT_AVATAR } from "./avatarUtils";

/**
 * Checks whether or not user belongs to a room. If true, return the user, if false, return undefined
 * @param userID the user's session ID
 * @returns User if the user is registered, undefined if not
 */
export function getUserInRoom(userID: string, room: Room): User | undefined {
    return room.members.find((member) => member.id === userID)
}

export function createUser(session: string): User {
    return {
        id: session,
        avatar: DEFAULT_AVATAR
    }
}