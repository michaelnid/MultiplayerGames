import type { Knex } from 'knex';
import type { Server } from 'socket.io';

export interface PluginContext {
  slug: string;
  pluginId: string;

  ws: {
    broadcast: (lobbyId: string, event: string, data: unknown) => void;
    sendTo: (lobbyId: string, userId: string, event: string, data: unknown) => void;
    onMessage: (event: string, handler: (data: unknown, userId: string, lobbyId: string) => void) => void;
  };

  stats: {
    recordResult: (userId: string, result: { win?: boolean; draw?: boolean; score?: number }) => Promise<void>;
    getLeaderboard: (options?: { limit?: number; period?: string }) => Promise<unknown[]>;
    getPlayerStats: (userId: string) => Promise<unknown>;
  };

  lobby: {
    getPlayers: (lobbyId: string) => Promise<{ userId: string; username: string }[]>;
    setStatus: (lobbyId: string, status: string) => Promise<void>;
    onPlayerJoin: (handler: (userId: string, lobbyId: string) => void) => void;
    onPlayerLeave: (handler: (userId: string, lobbyId: string) => void) => void;
  };

  storage: {
    get: (key: string, lobbyId?: string) => Promise<unknown>;
    set: (key: string, value: unknown, lobbyId?: string) => Promise<void>;
  };

  settings: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    getAll: () => Promise<Record<string, unknown>>;
  };

  chat: {
    sendSystem: (lobbyId: string, message: string) => void;
  };
}

export interface PluginDispatch {
  message: (event: string, data: unknown, userId: string, lobbyId: string) => void;
  playerJoin: (userId: string, lobbyId: string) => void;
  playerLeave: (userId: string, lobbyId: string) => void;
}

export interface PluginContextResult {
  context: PluginContext;
  dispatch: PluginDispatch;
}

export function createPluginContext(
  slug: string,
  pluginId: string,
  db: Knex,
  io: Server,
): PluginContextResult {
  const eventHandlers = new Map<string, ((data: unknown, userId: string, lobbyId: string) => void)[]>();
  const joinHandlers: ((userId: string, lobbyId: string) => void)[] = [];
  const leaveHandlers: ((userId: string, lobbyId: string) => void)[] = [];

  const context: PluginContext = {
    slug,
    pluginId,

    ws: {
      broadcast(lobbyId, event, data) {
        io.to(`lobby:${lobbyId}`).emit(`plugin:${slug}:${event}`, data);
      },
      sendTo(_lobbyId, userId, event, data) {
        io.to(`user:${userId}`).emit(`plugin:${slug}:${event}`, data);
      },
      onMessage(event, handler) {
        const handlers = eventHandlers.get(event) || [];
        handlers.push(handler);
        eventHandlers.set(event, handlers);
      },
    },

    stats: {
      async recordResult(userId, result) {
        const existing = await db('player_stats')
          .where({ user_id: userId, plugin_id: pluginId })
          .first();

        if (existing) {
          const updates: Record<string, unknown> = {
            games_played: existing.games_played + 1,
            last_played: db.fn.now(),
          };
          if (result.win) updates.wins = existing.wins + 1;
          else if (result.draw) updates.draws = existing.draws + 1;
          else updates.losses = existing.losses + 1;
          if (result.score) updates.total_score = existing.total_score + result.score;

          await db('player_stats')
            .where({ user_id: userId, plugin_id: pluginId })
            .update(updates);
        } else {
          await db('player_stats').insert({
            user_id: userId,
            plugin_id: pluginId,
            wins: result.win ? 1 : 0,
            losses: !result.win && !result.draw ? 1 : 0,
            draws: result.draw ? 1 : 0,
            total_score: result.score || 0,
            games_played: 1,
            last_played: db.fn.now(),
          });
        }
      },

      async getLeaderboard(options = {}) {
        const limit = options.limit || 10;
        const query = db('player_stats')
          .where('plugin_id', pluginId)
          .join('users', 'player_stats.user_id', 'users.id')
          .select(
            'users.id as userId',
            'users.username',
            'player_stats.wins',
            'player_stats.losses',
            'player_stats.draws',
            'player_stats.total_score as totalScore',
            'player_stats.games_played as gamesPlayed',
          )
          .orderBy('player_stats.total_score', 'desc')
          .limit(limit);

        if (options.period === 'woche') {
          query.where('player_stats.last_played', '>=', db.raw("NOW() - INTERVAL '7 days'"));
        } else if (options.period === 'monat') {
          query.where('player_stats.last_played', '>=', db.raw("NOW() - INTERVAL '30 days'"));
        }

        return query;
      },

      async getPlayerStats(userId) {
        const row = await db('player_stats')
          .where({ user_id: userId, plugin_id: pluginId })
          .select(
            'user_id as userId',
            'plugin_id as pluginId',
            'wins',
            'losses',
            'draws',
            'total_score as totalScore',
            'games_played as gamesPlayed',
            'last_played as lastPlayed',
          )
          .first();
        return row ?? null;
      },
    },

    lobby: {
      async getPlayers(lobbyId) {
        return db('lobby_players')
          .where('lobby_id', lobbyId)
          .join('users', 'lobby_players.user_id', 'users.id')
          .select('users.id as userId', 'users.username');
      },

      async setStatus(lobbyId, status) {
        const updates: Record<string, unknown> = { status };
        if (status === 'beendet' || status === 'geschlossen') {
          updates.closed_at = db.fn.now();
        }
        await db('lobbies').where('id', lobbyId).update(updates);
        io.to(`lobby:${lobbyId}`).emit('lobby:status-changed', { lobbyId, status });
      },

      onPlayerJoin(handler) {
        joinHandlers.push(handler);
      },

      onPlayerLeave(handler) {
        leaveHandlers.push(handler);
      },
    },

    storage: {
      async get(key, lobbyId) {
        const fullKey = lobbyId ? `${lobbyId}:${key}` : key;
        const row = await db('plugin_settings')
          .where({ plugin_id: pluginId, key: `storage:${fullKey}` })
          .first();
        return row?.value ?? null;
      },

      async set(key, value, lobbyId) {
        const fullKey = lobbyId ? `${lobbyId}:${key}` : key;
        const dbKey = `storage:${fullKey}`;
        const existing = await db('plugin_settings')
          .where({ plugin_id: pluginId, key: dbKey })
          .first();

        if (existing) {
          await db('plugin_settings')
            .where({ plugin_id: pluginId, key: dbKey })
            .update({ value: JSON.stringify(value), updated_at: db.fn.now() });
        } else {
          await db('plugin_settings').insert({
            plugin_id: pluginId,
            key: dbKey,
            value: JSON.stringify(value),
          });
        }
      },
    },

    settings: {
      async get(key) {
        const row = await db('plugin_settings')
          .where({ plugin_id: pluginId, key: `settings:${key}` })
          .first();
        return row?.value ?? null;
      },

      async set(key, value) {
        const dbKey = `settings:${key}`;
        const existing = await db('plugin_settings')
          .where({ plugin_id: pluginId, key: dbKey })
          .first();

        if (existing) {
          await db('plugin_settings')
            .where({ plugin_id: pluginId, key: dbKey })
            .update({ value: JSON.stringify(value), updated_at: db.fn.now() });
        } else {
          await db('plugin_settings').insert({
            plugin_id: pluginId,
            key: dbKey,
            value: JSON.stringify(value),
          });
        }
      },

      async getAll() {
        const rows = await db('plugin_settings')
          .where('plugin_id', pluginId)
          .andWhere('key', 'like', 'settings:%');

        const result: Record<string, unknown> = {};
        for (const row of rows) {
          const key = row.key.replace('settings:', '');
          result[key] = row.value;
        }
        return result;
      },
    },

    chat: {
      sendSystem(lobbyId, message) {
        io.to(`lobby:${lobbyId}`).emit('chat:system', {
          message,
          system: true,
          timestamp: new Date().toISOString(),
        });
      },
    },
  };

  const dispatch: PluginDispatch = {
    message(event, data, userId, lobbyId) {
      const handlers = eventHandlers.get(event) || [];
      for (const handler of handlers) {
        try {
          handler(data, userId, lobbyId);
        } catch (err) {
          console.error(`[${slug}] Fehler in Event-Handler "${event}":`, err);
        }
      }
    },
    playerJoin(userId, lobbyId) {
      for (const handler of joinHandlers) {
        try {
          handler(userId, lobbyId);
        } catch (err) {
          console.error(`[${slug}] Fehler in onPlayerJoin-Handler:`, err);
        }
      }
    },
    playerLeave(userId, lobbyId) {
      for (const handler of leaveHandlers) {
        try {
          handler(userId, lobbyId);
        } catch (err) {
          console.error(`[${slug}] Fehler in onPlayerLeave-Handler:`, err);
        }
      }
    },
  };

  return { context, dispatch };
}
