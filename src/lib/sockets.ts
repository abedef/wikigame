import { Server, type ServerOptions } from 'socket.io';
import type { RoomID, User } from './types';
import { createRoom, createUser, exportRoomState, getAvatars, getRoomState, joinRoom } from './utils';

export default {
    name: 'webSocketServer',
    // TODO what is the type of server? see vite docs
    configureServer(server: { httpServer: Partial<ServerOptions>; }) {
        const io = new Server(server.httpServer);

        io.on('connection', (socket) => {
            let currentUser: User;
            let currentRoomID: RoomID;

            socket.on('host', (session: string) => {
                currentUser = createUser(session);
                const { roomID, room } = createRoom(currentUser);
                const avatar = currentUser.avatar;
                console.log(`${avatar} created room ${roomID}`);
                currentRoomID = roomID;
                socket.join(roomID);
                socket.emit('joined', { host: room.hostID, roomID, avatar });
            });

            socket.on('join', ({ session, roomID }) => {
                const rooms = getRoomState();
                if (!(roomID in rooms)) {
                    socket.emit('error', `invalid room code (${roomID})`)
                    return
                }

                const room = rooms[roomID];
                if (room.members.length >= 8) {
                    socket.emit('error', 'Room full!')
                    return
                }

                currentUser = currentUser ?? createUser(session);
                console.log(`${currentUser.id} attempting to join room ${roomID} with members ${room.members.map(i => i.avatar).join(',')}`)
                const avatar = joinRoom(currentUser, roomID);
                currentUser.avatar = avatar;
                console.log(`${avatar} joined room ${roomID}`);
                currentRoomID = roomID;
                socket.join(currentUser.id)
                socket.join(roomID)
                socket.emit('joined', { host: room.hostID, roomID, avatar });
                const avatars = getAvatars(room);
                socket.emit('members', { avatars, host: room.hostID });
                socket.to(roomID).emit('members', { avatars, host: room.hostID });
            });

            socket.on('leave', (reason) => {
                const rooms = getRoomState();
                console.log(`${currentUser} left ${currentRoomID}: ${reason}`);

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
                socket.to(currentRoomID).emit('members', { avatars, host: room.hostID });
                socket.leave(currentRoomID);
                console.log(JSON.stringify(avatars));

                if (room.hostID === currentUser.id) {
                    room.hostID = room.members.length > 0 ? room.members[0].id : "";
                    socket.to(room.hostID).emit('joined', { host: room.hostID, roomID: currentRoomID, avatar: currentUser.avatar })
                }

                exportRoomState(rooms);
            });

            socket.on('disconnect', (reason) => {
                console.log(`${currentUser} disconnected from ${currentRoomID}: ${reason}`);
                const rooms = getRoomState();
                const room = rooms[currentRoomID]; // TODO Make sure this is not null
                if (!room) {
                    return;
                }
                if (room.hostID === currentUser.id) {
                    room.hostID = room.members.length > 0 ? room.members[0].id : "";
                    socket.to(room.hostID).emit('joined', { host: room.hostID, roomID: currentRoomID, avatar: currentUser.avatar })
                }
            });
        });
    },
};