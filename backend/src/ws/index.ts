import type { Server, Socket } from 'socket.io';
import type { Knex } from 'knex';
import { WS_EVENTS } from '@mike-games/shared';

interface SocketData {
  userId?: string;
  username?: string;
  currentLobby?: string;
}

export function setupWebSocket(io: Server, db: Knex) {
  io.on('connection', (socket: Socket) => {
    const data: SocketData = {};

    socket.on('auth', async (payload: { userId: string; username: string }) => {
      if (!payload.userId || !payload.username) return;

      const user = await db('users').where('id', payload.userId).first();
      if (!user) return;

      data.userId = user.id;
      data.username = user.username;
      socket.join(`user:${user.id}`);
    });

    socket.on(WS_EVENTS.LOBBY_JOIN, async (payload: { lobbyId: string }) => {
      if (!data.userId) return;

      const lobby = await db('lobbies')
        .where('id', payload.lobbyId)
        .whereIn('status', ['wartend', 'laeuft'])
        .first();

      if (!lobby) return;

      const isMember = await db('lobby_players')
        .where({ lobby_id: lobby.id, user_id: data.userId })
        .first();

      if (!isMember) return;

      if (data.currentLobby) {
        socket.leave(`lobby:${data.currentLobby}`);
      }

      data.currentLobby = lobby.id;
      socket.join(`lobby:${lobby.id}`);

      io.to(`lobby:${lobby.id}`).emit(WS_EVENTS.LOBBY_PLAYER_JOINED, {
        userId: data.userId,
        username: data.username,
      });
    });

    socket.on(WS_EVENTS.LOBBY_LEAVE, () => {
      if (!data.userId || !data.currentLobby) return;

      io.to(`lobby:${data.currentLobby}`).emit(WS_EVENTS.LOBBY_PLAYER_LEFT, {
        userId: data.userId,
        username: data.username,
      });

      socket.leave(`lobby:${data.currentLobby}`);
      data.currentLobby = undefined;
    });

    socket.on(WS_EVENTS.CHAT_MESSAGE, (payload: { message: string }) => {
      if (!data.userId || !data.currentLobby) return;
      if (!payload.message || payload.message.trim().length === 0) return;
      if (payload.message.length > 500) return;

      io.to(`lobby:${data.currentLobby}`).emit(WS_EVENTS.CHAT_MESSAGE, {
        userId: data.userId,
        username: data.username,
        message: payload.message.trim(),
        system: false,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on(WS_EVENTS.GAME_EVENT, (payload: { event: string; data: unknown }) => {
      if (!data.userId || !data.currentLobby) return;

      io.to(`lobby:${data.currentLobby}`).emit(WS_EVENTS.GAME_EVENT, {
        userId: data.userId,
        event: payload.event,
        data: payload.data,
      });
    });

    socket.on('disconnect', () => {
      if (data.currentLobby) {
        io.to(`lobby:${data.currentLobby}`).emit(WS_EVENTS.LOBBY_PLAYER_LEFT, {
          userId: data.userId,
          username: data.username,
        });
      }
    });
  });
}
