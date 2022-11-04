import { Server, type ServerOptions } from 'socket.io';

import {
    configure,
    putObject,
    getObject,
} from "@genieindex/miniojs";

function getAvatar(user: string): string {
    if (user in users) {
        return users[user];
    }

    return "⁇";
}

function register(user: string): string {
    const avatar = avatars.pop() ?? "👽";
    console.log(`Registered ${user} as ${avatar}`);
    users[user] = avatar;

    exportState();

    return avatar;
}

let avatars = [
    '🐶', '🐱', '🐭',
    '🐹', '🐰', '🦊',
    '🐻', '🐼', '🐻',
    '🐨', '🐯', '🦁',
    '🐮', '🐷', '🐸',
    '🐵', '🐔', '🐧',
    '🐦', '🐤', '🐙'
];

interface Room {
    host: string;
    members: string[];
};

interface RoomsMap {
    [index: string]: Room;
};

interface UsersMap {
    [index: string]: string;
}

let rooms: RoomsMap = {};
let users: UsersMap = {};

async function exportState() {
    const { MINIO_ENDPOINT, MINIO_ACCESS_ID, MINIO_ACCESS_KEY } = await import("./secrets");
    configure(
        MINIO_ENDPOINT,
        true,
        MINIO_ACCESS_ID,
        MINIO_ACCESS_KEY
    );
    return putObject("lietome", {
        avatars,
        rooms,
        users,
    });
}

interface MinioObject {
    avatars: string[];
    users: UsersMap;
    rooms: RoomsMap;
};

function importState() {
    configure(
        "minio.genieindex.ca",
        true,
        "D4itITvnTAIYqzTs",
        "8xzkDQJfKOitP6RG7WEUh1XGu91Tr8Z7"
    );
    console.log("Trying...");
    getObject("lietome").then(
        (obj: MinioObject) => {
            avatars = obj.avatars;
            users = obj.users;
            rooms = obj.rooms;

            console.log(`set avatars to ${avatars}`);
            console.log(`set users to ${JSON.stringify(users)}`);
            console.log(`set rooms to ${JSON.stringify(rooms)}`);
        },
        // TODO what is the type of err? see minio docs
        (err: {}) => {
            console.log(`error getting object: ${err}`);
            exportState();
        },
    );
}

function createRoom(user: string): string {
    let room;
    do {
        room = `${10000 + Math.floor(Math.random() * 90000)}`;
    } while (room in rooms);

    rooms[room] = {
        host: user,
        members: [],
    };

    exportState();

    return room;
}

importState();

const webSocketServer = {
    name: 'webSocketServer',
    // TODO what is the type of server? see vite docs
    configureServer(server: { httpServer: Partial<ServerOptions>; }) {
        const io = new Server(server.httpServer);

        io.on('connection', (socket) => {
            let user: string;

            socket.emit('eventFromServer', `Hello, World 👋`);

            socket.on('disconnect', (reason) => {
                console.log(`${getAvatar(user)} left`);

                for (let room in rooms) {
                    const { host, members } = rooms[room];

                    if (host === user) {
                        if (members.length === 0) {
                            delete rooms[room];
                        } else {
                            let luckyPerson = `${members.pop()}`;
                            rooms[room].host = luckyPerson;
                            io.to(room).emit('membersChanged', [getAvatar(luckyPerson), ...members.map((m) => getAvatar(m))]);
                        }
                    } else if (members.includes(user)) {
                        console.log(`Removing ${getAvatar(user)} from room ${room} members`);
                        const index = members.indexOf(user);
                        if (index > -1) { // only splice array when item is found
                            members.splice(index, 1); // 2nd parameter means remove one item only
                            io.to(room).emit('membersChanged', [getAvatar(host), ...members.map((m) => getAvatar(m))]);
                        }
                    }
                }

                exportState();
            });

            socket.on('register', (session: string) => {
                user = session;
                socket.data = { session };
                let avatar = getAvatar(session);
                console.log(`Registering ${session} (${avatar})`);
                if (avatar === "⁇") {
                    if (avatars.length == 0) {
                        // Sorry we're full
                        socket.emit('error', 'full');
                        return
                    } else {
                        avatar = register(session);
                    }
                }

                socket.join(session);
                socket.emit('greet', avatar)
            });

            socket.on('host', (session: string) => {
                const avatar = getAvatar(session);
                console.log(`${avatar} is trying to host a room`);

                if (avatar === "⁇") {
                    socket.emit('error', 'unregistered');
                    return
                }

                const room = createRoom(session);
                console.log(`${avatar} created new room ${room}`);

                socket.join(room);
                socket.emit('joined', { room, avatar })
            });

            socket.on('leave', (message: string) => {
                console.log(`${getAvatar(user)} left`);

                for (let room in rooms) {
                    const { host, members } = rooms[room];

                    if (host === user) {
                        if (members.length === 0) {
                            delete rooms[room];
                        } else {
                            let luckyPerson = `${members.pop()}`;
                            rooms[room].host = luckyPerson;
                            io.to(room).emit('membersChanged', [getAvatar(luckyPerson), ...members.map((m) => getAvatar(m))]);
                        }
                    } else if (members.includes(user)) {
                        console.log(`Removing ${getAvatar(user)} from room ${room} members`);
                        const index = members.indexOf(user);
                        if (index > -1) { // only splice array when item is found
                            members.splice(index, 1); // 2nd parameter means remove one item only
                            io.to(room).emit('membersChanged', [getAvatar(host), ...members.map((m) => getAvatar(m))]);
                        }
                    }
                }

                exportState();
            });

            socket.on('join', (message: string) => {
                let { session, room }: { session: string, room: string } = JSON.parse(message);
                const avatar = getAvatar(session);
                console.log(`${avatar} is trying to join room ${room}`);

                if (avatar === "⁇") {
                    socket.emit('error', 'unregistered');
                    return
                }

                if (!(room in rooms)) {
                    socket.emit('error', `invalid room code (${room})`)
                    return;
                }

                let { host, members } = rooms[room];
                if (!(session in members)) {
                    members.push(session);
                    exportState();
                }
                socket.emit('joined', { room, avatar });
                socket.join(room);
                io.to(room).emit('membersChanged', [getAvatar(host), ...members.map((m) => getAvatar(m))]);
            });
        });
    },
};

export default webSocketServer;