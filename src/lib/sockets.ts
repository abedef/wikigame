import { Server, type ServerOptions } from 'socket.io';
import type { GameArticle, GameConfig, RoomID, User } from './types';
import { createRoom, createUser, exportRoomState, getAvatars, getRoom, getRoomState, joinRoom } from './utils';
import { advanceStage, selectArticle, startGame } from './utils/gameUtils';
import { SocketEvent } from './enums';
import PocketBase from 'pocketbase';

const env = { PUBLIC_POCKETBASE_URL: "http://100.77.33.133:8088" };

const chunkate = (items: any[], chunkSize = 10) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        chunks.push(chunk);
    }
    return chunks;
}

const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL);

export default {
    name: 'webSocketServer',
    // TODO what is the type of server? see vite docs
    configureServer(server: { httpServer: Partial<ServerOptions>; }) {
        const io = new Server(server.httpServer);

        io.on(SocketEvent.Connection, (socket) => {
            let currentUser: User;
            let currentRoomID: RoomID;

            socket.on(SocketEvent.Host, (session: string, config: GameConfig) => {
                currentUser = createUser(session);
                const { roomID, room } = createRoom(currentUser, config);
                const avatar = currentUser.avatar;
                console.log(`${avatar} created room ${roomID}`);
                currentRoomID = roomID;
                socket.join(roomID);
                socket.emit(SocketEvent.Joined, { host: room.hostID, roomID, avatar });
                const avatars = getAvatars(room);
                socket.emit(SocketEvent.Members, { avatars, host: room.hostID });
                socket.to(roomID).emit(SocketEvent.Members, { avatars, host: room.hostID });
            });

            socket.on(SocketEvent.Join, ({ session, roomID }) => {
                const rooms = getRoomState();
                if (!(roomID in rooms)) {
                    socket.emit(SocketEvent.Error, `invalid room code (${roomID})`);
                    return;
                }

                const room = rooms[roomID];
                if (room.members.length >= 8) {
                    socket.emit(SocketEvent.Error, 'Room full!');
                    return;
                }
                if (room.gameState.round > 0) {
                    socket.emit(SocketEvent.Error, 'Game started!');
                    return;
                }

                currentUser = currentUser ?? createUser(session);
                console.log(`${currentUser.id} attempting to join room ${roomID} with members ${room.members.map(i => i.avatar).join(',')}`)
                const avatar = joinRoom(currentUser, roomID);
                currentUser.avatar = avatar;
                console.log(`${avatar} joined room ${roomID}`);
                currentRoomID = roomID;
                socket.join(currentUser.id);
                socket.join(roomID);
                socket.emit(SocketEvent.Joined, { host: room.hostID, roomID, avatar });
                const avatars = getAvatars(room);
                socket.emit(SocketEvent.Members, { avatars, host: room.hostID });
                socket.to(roomID).emit(SocketEvent.Members, { avatars, host: room.hostID });
            });

            socket.on(SocketEvent.Start, async (roomID: string) => {
                console.log(`Starting game ${roomID}`);
                startGame(roomID);
                socket.emit(SocketEvent.Started, []);
                const rooms = getRoomState();
                const room = rooms[roomID]
                if (!room) {
                    return;
                }
                const articles = (await pb
                    .collection<GameArticle>("articles")
                    .getList(1, (room.members.length - 1) * 10, {
                      sort: "@random"
                    })).items;
                const chunks = chunkate(articles);
                room.members.filter(member => member.id !== room.hostID).forEach((member, i) => socket.to(member.id).emit(SocketEvent.Started, chunks[i]));
            });

            socket.on(SocketEvent.AdvanceStage, () => {
                const room = getRoom(currentRoomID)
                if (room !== undefined) {
                    const nextStage = advanceStage(room)
                    socket.emit(SocketEvent.Advance, { nextStage });
                    socket.to(currentRoomID).emit(SocketEvent.Advance, { nextStage });
                }
            });

            socket.on(SocketEvent.SelectArticle, (article: GameArticle) => {
                const nextStage = selectArticle(currentUser, { url: article.url, title: article.title }, currentRoomID);
                console.log(`someone locked in ${article.title}`)
                socket.emit(SocketEvent.Advance, { nextStage });
                socket.to(currentRoomID).emit(SocketEvent.Advance, { nextStage });
            });

            socket.on(SocketEvent.Leave, (reason) => {
                const rooms = getRoomState();
                console.log(`${currentUser.name ?? currentUser.avatar} left ${currentRoomID}: ${reason}`);
                const room = rooms[currentRoomID]; // TODO Make sure this is not null
                if (!room) {
                    return;
                }

                room.members = room.members.filter((member) => {
                    if (member.id === currentUser.id) {
                        return false;
                    }
                    return true;
                });
                room.avatars.push(currentUser.avatar);
                const avatars = getAvatars(room);
                socket.to(currentRoomID).emit(SocketEvent.Members, { avatars, host: room.hostID });
                socket.leave(currentRoomID);
                console.log(JSON.stringify(avatars));

                if (room.hostID === currentUser.id) {
                    room.hostID = room.members.length > 0 ? room.members[0].id : "";
                    socket.to(room.hostID).emit(SocketEvent.Joined, { host: room.hostID, roomID: currentRoomID, avatar: currentUser.avatar })
                }

                exportRoomState(rooms);
            });

            socket.on(SocketEvent.Disconnect, (reason) => {
                console.log(`${currentUser} disconnected from ${currentRoomID}: ${reason}`);
                const rooms = getRoomState();
                const room = rooms[currentRoomID]; // TODO Make sure this is not null
                if (!room) {
                    return;
                }
                if (room.hostID === currentUser.id) {
                    room.hostID = room.members.length > 0 ? room.members[0].id : "";
                    socket.to(room.hostID).emit(SocketEvent.Joined, { host: room.hostID, roomID: currentRoomID, avatar: currentUser.avatar })
                }
            });
        });
    },
};