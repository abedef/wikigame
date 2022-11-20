import { Server, type ServerOptions } from 'socket.io';

import {
    configure,
    putObject,
    getObject,
} from "@genieindex/miniojs";

/**
 * Checks whether or not user is registered
 * @param user the user's session ID
 * @returns true if the user is registered
 */
function isRegistered(user: User, room: Room): boolean {
    return room.members.filter((m) => m.user === user).length > 0;
}

/**
 * Returns user's avatar if one has been set, or ⁇ otherwise
 * @param user the user's session ID
 * @returns the user's avatar, if it exists
 */
function getAvatar(user: User, room: Room): Avatar {
    if (isRegistered(user, room)) {
        return room.members.reduce((prev, curr) => {
            if (curr.user === user) {
                prev = curr.avatar;
            }
            return prev;
        }, '⁇');
    }

    return "⁇";
}

/**
 * Returns all the used avatars (i.e. member list) in the provided room.
 * @param room the room for which to return the avatars
 * @returns all used avatars in that room
 */
function getAvatars(room: Room): Avatar[] {
    return room.members.map(({ avatar }) => avatar);
}

const avatars = [
    '🐶', '🐱', '🐭',
    '🐹', '🐰', '🦊',
    '🐻', '🐼', '🐻',
    '🐨', '🐯', '🦁',
    '🐮', '🐷', '🐸',
    '🐵', '🐔', '🐧',
    '🐦', '🐤', '🐙'
];

interface Room {
    host: User; // User ID of host
    members: MemberMap[]; // all members, including host
    avatars: Avatar[]; // available, unreserved avatars
};

type User = string
type Avatar = string
type RoomID = string

interface RoomsMap {
    [index: RoomID]: Room;
};

interface MemberMap {
    user: User;
    avatar: Avatar;
}

let rooms: RoomsMap = {};

async function exportState() {
    const { MINIO_ENDPOINT, MINIO_ACCESS_ID, MINIO_ACCESS_KEY } = await import("./secrets");
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

interface MinioObject {
    rooms: RoomsMap;
};

async function importState() {
    const { MINIO_ENDPOINT, MINIO_ACCESS_ID, MINIO_ACCESS_KEY } = await import("./secrets");
    configure(
        MINIO_ENDPOINT,
        true,
        MINIO_ACCESS_ID,
        MINIO_ACCESS_KEY
    );

    console.log("Trying...");
    getObject("lietome").then(
        (obj: MinioObject) => {
            rooms = obj.rooms;

            console.log(`imported rooms ${JSON.stringify(rooms)}`);
        }).catch(
            // TODO what is the type of err? see minio docs
            (err: {}) => {
                console.log(`error getting object: ${err}`);
                exportState();
            },
        );
}

/**
 * Joins user to the room with the provided ID as a non-host.
 * Calling this function when the user is already in the room is harmless.
 * @param user user to add to the room
 * @param roomID the room to add the user to
 * @returns the avatar assigned to this user
 */
function joinRoom(user: User, roomID: RoomID): Avatar {
    const room = rooms[roomID];
    if (isRegistered(user, room)) {
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

function createRoom(user: User): { roomID: RoomID, room: Room } {
    let room: RoomID;
    do {
        room = `${10000 + Math.floor(Math.random() * 90000)}`;
    } while (room in rooms);

    rooms[room] = {
        host: user,
        members: [],
        avatars: [...avatars],
    };

    joinRoom(user, room);

    exportState();

    return { roomID: room, room: rooms[room] };
}

importState();

const webSocketServer = {
    name: 'webSocketServer',
    // TODO what is the type of server? see vite docs
    configureServer(server: { httpServer: Partial<ServerOptions>; }) {
        const io = new Server(server.httpServer);

        io.on('connection', (socket) => {
            let currentUser: User;
            let currentRoomID: RoomID;

            socket.on('disconnect', (reason) => {
                console.log(`${currentUser} left ${currentRoomID}: ${reason}`);

                const room = rooms[currentRoomID]; // TODO Make sure this is not null
                if (!room) {
                    return;
                }

                room.members = room.members.filter((m) => {
                    if (m.user === currentUser) {
                        room.avatars.push(m.avatar);
                        return false;
                    }
                    return true;
                });
                const avatars = getAvatars(room);
                socket.to(currentRoomID).emit('members', { avatars, host: room.host });
                socket.leave(currentRoomID);
                console.log(JSON.stringify(avatars));

                if (room.host === currentUser) {
                    room.host = room.members.length > 0 ? room.members[0].user : "";
                    console.log(room.host);
                    socket.to(room.host).emit('joined', { host: room.host, roomID: currentRoomID, avatar: getAvatar(room.host, room) })
                }

                exportState();
            });

            socket.on('host', (session: User) => {
                currentUser = session;
                const { roomID, room } = createRoom(session);
                const avatar = getAvatar(session, room);
                console.log(`${avatar} created room ${roomID}`);
                currentRoomID = roomID;
                socket.join(roomID);
                socket.emit('joined', { host: room.host, roomID, avatar });
            });

            socket.on('join', ({ session, roomID }) => {
                currentUser = session;
                if (!(roomID in rooms)) {
                    socket.emit('error', `invalid room code (${roomID})`)
                    return
                }

                const room = rooms[roomID];
                const avatar = joinRoom(currentUser, roomID);
                console.log(`${avatar} joined room ${roomID}`);
                currentRoomID = roomID;
                socket.join(currentUser)
                socket.join(roomID)
                socket.emit('joined', { host: room.host, roomID, avatar });
                const avatars = getAvatars(room);
                socket.emit('members', { avatars, host: room.host });
                socket.to(roomID).emit('members', { avatars, host: room.host });
            });
        });
    },
};

export default webSocketServer;