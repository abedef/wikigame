export const AVATARS = [
    '🐶', '🐱', '🐭',
    '🐹', '🐰', '🦊',
    '🐻', '🐼', '🐻',
    '🐨', '🐯', '🦁',
    '🐮', '🐷', '🐸',
    '🐵', '🐔', '🐧',
    '🐦', '🐤', '🐙'
];

export const DEFAULT_AVATAR = '❓';

/**
 * Get a random T from an array of T and the index of said T in T[]
 * @param arr an array of type T
 * @returns [
 *   T: the item
 *   number: the index of T in T[]
 * ]
 */
export function getRandomFromArray<T>(arr: T[]): [T | undefined, number] {
    const index = Math.floor(Math.random()*arr.length);
    return [arr[index], index]
};

/**
 * Get a random avatar from AVATARS and the index of said avatar in AVATARS
 * @returns [
 *   string: the avatar
 *   number: the index of the avatar in AVATARS
 * ]
 */
export function getRandomAvatar(): [string, number] {
    const [avatar, index] = getRandomFromArray(AVATARS);
    return [avatar || DEFAULT_AVATAR, index]
};