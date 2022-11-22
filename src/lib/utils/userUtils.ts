import type { Avatar, Room, User } from "$lib/types";

/**
 * Checks whether or not user is registered
 * @param user the user's session ID
 * @returns true if the user is registered
 */
 export function isUserRegistered(user: User, room: Room): boolean {
    return room.members.filter((m) => m.user === user).length > 0;
}

/**
 * Returns user's avatar if one has been set, or ⁇ otherwise
 * @param user the user's session ID
 * @returns the user's avatar, if it exists
 */
 export function getUserAvatar(user: User, room: Room): Avatar {
    if (isUserRegistered(user, room)) {
        return room.members.reduce((prev, curr) => {
            if (curr.user === user) {
                prev = curr.avatar;
            }
            return prev;
        }, '⁇');
    }

    return "⁇";
}