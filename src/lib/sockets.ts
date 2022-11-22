import { Server, type ServerOptions } from 'socket.io';
import type { RoomID, User } from './types';
import { createRoom, exportRoomState, getAvatars, getRoomState, getUserAvatar, joinRoom } from './utils';

export default {
    name: 'webSocketServer',
    // TODO what is the type of server? see vite docs
    configureServer(server: { httpServer: Partial<ServerOptions>; }) {
        const io = new Server(server.httpServer);

        io.on('connection', (socket) => {
            let currentUser: User;
            let currentRoomID: RoomID;

            socket.on('disconnect', (reason) => {
                const rooms = getRoomState();
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
                    socket.to(room.host).emit('joined', { host: room.host, roomID: currentRoomID, avatar: getUserAvatar(room.host, room) })
                }

                exportRoomState(rooms);
            });

            socket.on('host', (session: User) => {
                currentUser = session;
                const { roomID, room } = createRoom(session);
                const avatar = getUserAvatar(session, room);
                console.log(`${avatar} created room ${roomID}`);
                currentRoomID = roomID;
                socket.join(roomID);
                socket.emit('joined', { host: room.host, roomID, avatar });
            });

            socket.on('join', ({ session, roomID }) => {
                const rooms = getRoomState();
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