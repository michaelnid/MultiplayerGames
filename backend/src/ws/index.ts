import type { Server, Socket } from 'socket.io';
import type { Knex } from 'knex';
import { WS_EVENTS } from '@mike-games/shared';
import { getPluginDispatch } from '../plugin-system/loader.js';
import { consumeSocketAuthToken } from './auth-token.js';

interface SocketData {
  userId?: string;
  username?: string;
  currentLobby?: string;
  currentPluginId?: string;
}

export function setupWebSocket(io: Server, db: Knex) {
  io.on('connection', (socket: Socket) => {
    const data: SocketData = {};

    socket.on('auth', async (payload: { token?: string }) => {
      if (!payload?.token) {
        socket.emit('auth:error', { message: 'Authentifizierung fehlgeschlagen' });
        return;
      }

      const tokenData = consumeSocketAuthToken(payload.token);
      if (!tokenData) {
        socket.emit('auth:error', { message: 'Token ungueltig oder abgelaufen' });
        return;
      }

      const user = await db('users')
        .where('id', tokenData.userId)
        .andWhere('username', tokenData.username)
        .first();
      if (!user) {
        socket.emit('auth:error', { message: 'Authentifizierung fehlgeschlagen' });
        return;
      }

      data.userId = user.id;
      data.username = user.username;
      socket.join(`user:${user.id}`);
      socket.emit('auth:ok');
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
      data.currentPluginId = lobby.plugin_id;
      socket.join(`lobby:${lobby.id}`);

      io.to(`lobby:${lobby.id}`).emit(WS_EVENTS.LOBBY_PLAYER_JOINED, {
        userId: data.userId,
        username: data.username,
      });

      const dispatch = getPluginDispatch(lobby.plugin_id);
      if (dispatch) {
        dispatch.playerJoin(data.userId, lobby.id);
      }
    });

    socket.on(WS_EVENTS.LOBBY_LEAVE, () => {
      if (!data.userId || !data.currentLobby) return;

      io.to(`lobby:${data.currentLobby}`).emit(WS_EVENTS.LOBBY_PLAYER_LEFT, {
        userId: data.userId,
        username: data.username,
      });

      if (data.currentPluginId) {
        const dispatch = getPluginDispatch(data.currentPluginId);
        if (dispatch) {
          dispatch.playerLeave(data.userId, data.currentLobby);
        }
      }

      socket.leave(`lobby:${data.currentLobby}`);
      data.currentLobby = undefined;
      data.currentPluginId = undefined;
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
      if (!payload.event || typeof payload.event !== 'string') return;

      io.to(`lobby:${data.currentLobby}`).emit(WS_EVENTS.GAME_EVENT, {
        userId: data.userId,
        event: payload.event,
        data: payload.data,
      });

      if (data.currentPluginId) {
        const dispatch = getPluginDispatch(data.currentPluginId);
        if (dispatch) {
          dispatch.message(payload.event, payload.data, data.userId, data.currentLobby);
        }
      }
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
