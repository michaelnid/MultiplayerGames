import type { FastifyInstance } from 'fastify';
import type { Server } from 'socket.io';
import { WS_EVENTS } from '@mike-games/shared';
import { db } from '../db/knex.js';
import { requireAdmin, requireAuth, requireGameMasterOrAdmin } from '../auth/middleware.js';
import { logAudit } from '../auth/audit.js';
import { generateLobbyCode } from '../lobby/code-generator.js';
import { parseJsonValue } from '../utils/json.js';

let io: Server | null = null;

export function setLobbyIO(ioInstance: Server) {
  io = ioInstance;
}

export async function lobbyRoutes(fastify: FastifyInstance) {
  const parseNumericSetting = (value: unknown, fallback: number): number => {
    const parsed = parseJsonValue(value);
    const num = Number(parsed);
    return Number.isFinite(num) ? num : fallback;
  };

  fastify.get('/', { preHandler: requireAuth }, async () => {
    const lobbies = await db('lobbies')
      .whereIn('status', ['wartend', 'laeuft'])
      .join('plugins', 'lobbies.plugin_id', 'plugins.id')
      .join('users', 'lobbies.created_by', 'users.id')
      .select(
        'lobbies.*',
        'plugins.name as plugin_name',
        'plugins.slug as plugin_slug',
        'users.username as creator_name',
      )
      .orderBy('lobbies.created_at', 'desc');

    const lobbyIds = lobbies.map((l) => l.id);
    const playerCounts = await db('lobby_players')
      .whereIn('lobby_id', lobbyIds)
      .groupBy('lobby_id')
      .select('lobby_id')
      .count('* as count');

    const countMap = new Map(playerCounts.map((pc) => [pc.lobby_id, Number(pc.count)]));

    return {
      success: true,
      data: lobbies.map((l) => ({
        id: l.id,
        pluginId: l.plugin_id,
        pluginName: l.plugin_name,
        pluginSlug: l.plugin_slug,
        createdBy: l.created_by,
        creatorName: l.creator_name,
        code: l.code,
        status: l.status,
        maxPlayers: l.max_players,
        minPlayers: l.min_players,
        playerCount: countMap.get(l.id) || 0,
        createdAt: l.created_at,
      })),
    };
  });

  fastify.post<{
    Body: { pluginSlug: string; maxPlayers?: number };
  }>('/', {
    preHandler: requireGameMasterOrAdmin,
    schema: {
      body: {
        type: 'object',
        required: ['pluginSlug'],
        properties: {
          pluginSlug: { type: 'string' },
          maxPlayers: { type: 'number', minimum: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { pluginSlug, maxPlayers } = request.body;
    const userId = request.session.userId!;

    const plugin = await db('plugins').where('slug', pluginSlug).andWhere('enabled', true).first();
    if (!plugin) {
      return reply.status(404).send({ success: false, error: 'Spiel nicht gefunden oder deaktiviert' });
    }

    const manifest = parseJsonValue(plugin.manifest) as Record<string, unknown>;
    const code = await generateLobbyCode(db);

    // Plugin-Settings lesen (ueberschreiben Manifest-Werte)
    const minSetting = await db('plugin_settings')
      .where({ plugin_id: plugin.id, key: 'settings:minPlayers' })
      .first();
    const maxSetting = await db('plugin_settings')
      .where({ plugin_id: plugin.id, key: 'settings:maxPlayers' })
      .first();

    const manifestMin = Number(manifest.minPlayers);
    const manifestMax = Number(manifest.maxPlayers);

    const fallbackMin = Number.isFinite(manifestMin) && manifestMin >= 1 ? manifestMin : 2;
    const fallbackMax = Number.isFinite(manifestMax) && manifestMax >= fallbackMin ? manifestMax : Math.max(8, fallbackMin);

    const effectiveMin = minSetting?.value != null ? parseNumericSetting(minSetting.value, fallbackMin) : fallbackMin;
    const effectiveMax = maxSetting?.value != null ? parseNumericSetting(maxSetting.value, fallbackMax) : fallbackMax;

    const boundedMin = Math.max(1, Math.floor(effectiveMin));
    const boundedMax = Math.max(boundedMin, Math.floor(effectiveMax));

    if (maxPlayers !== undefined && (maxPlayers < boundedMin || maxPlayers > boundedMax)) {
      return reply.status(400).send({
        success: false,
        error: `maxPlayers muss zwischen ${boundedMin} und ${boundedMax} liegen`,
      });
    }

    const [lobby] = await db('lobbies')
      .insert({
        plugin_id: plugin.id,
        created_by: userId,
        code,
        status: 'wartend',
        max_players: maxPlayers ?? boundedMax,
        min_players: boundedMin,
      })
      .returning('*');

    await db('lobby_players').insert({
      lobby_id: lobby.id,
      user_id: userId,
    });

    return {
      success: true,
      data: {
        lobbyId: lobby.id,
        code: lobby.code,
      },
    };
  });

  fastify.post<{
    Body: { code: string };
  }>('/join', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^\\d{4}$' },
        },
      },
    },
  }, async (request, reply) => {
    const { code } = request.body;
    const userId = request.session.userId!;

    const lobby = await db('lobbies')
      .where('code', code)
      .whereIn('status', ['wartend'])
      .first();

    if (!lobby) {
      return reply.status(404).send({ success: false, error: 'Lobby nicht gefunden oder bereits gestartet' });
    }

    const playerCount = await db('lobby_players')
      .where('lobby_id', lobby.id)
      .count('* as count')
      .first();

    if (Number(playerCount?.count) >= lobby.max_players) {
      return reply.status(400).send({ success: false, error: 'Lobby ist voll' });
    }

    const alreadyJoined = await db('lobby_players')
      .where({ lobby_id: lobby.id, user_id: userId })
      .first();

    if (alreadyJoined) {
      return { success: true, data: { lobbyId: lobby.id } };
    }

    await db('lobby_players').insert({
      lobby_id: lobby.id,
      user_id: userId,
    });

    return { success: true, data: { lobbyId: lobby.id } };
  });

  fastify.get<{
    Params: { id: string };
  }>('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const lobby = await db('lobbies')
      .where('lobbies.id', request.params.id)
      .join('plugins', 'lobbies.plugin_id', 'plugins.id')
      .join('users', 'lobbies.created_by', 'users.id')
      .select(
        'lobbies.*',
        'plugins.name as plugin_name',
        'plugins.slug as plugin_slug',
        'users.username as creator_name',
      )
      .first();

    if (!lobby) {
      return reply.status(404).send({ success: false, error: 'Lobby nicht gefunden' });
    }

    const players = await db('lobby_players')
      .where('lobby_id', lobby.id)
      .join('users', 'lobby_players.user_id', 'users.id')
      .select('users.id as userId', 'users.username', 'lobby_players.joined_at');

    return {
      success: true,
      data: {
        id: lobby.id,
        pluginId: lobby.plugin_id,
        pluginName: lobby.plugin_name,
        pluginSlug: lobby.plugin_slug,
        createdBy: lobby.created_by,
        creatorName: lobby.creator_name,
        code: lobby.code,
        status: lobby.status,
        maxPlayers: lobby.max_players,
        minPlayers: lobby.min_players,
        createdAt: lobby.created_at,
        players,
      },
    };
  });

  fastify.post<{
    Params: { id: string };
  }>('/:id/leave', { preHandler: requireAuth }, async (request) => {
    const userId = request.session.userId!;
    await db('lobby_players')
      .where({ lobby_id: request.params.id, user_id: userId })
      .delete();
    return { success: true };
  });

  fastify.post<{
    Params: { id: string };
  }>('/:id/start', { preHandler: requireGameMasterOrAdmin }, async (request, reply) => {
    const lobby = await db('lobbies').where('id', request.params.id).first();
    if (!lobby) {
      return reply.status(404).send({ success: false, error: 'Lobby nicht gefunden' });
    }

    if (lobby.status !== 'wartend') {
      return reply.status(400).send({ success: false, error: 'Lobby ist nicht im Wartezustand' });
    }

    if (lobby.created_by !== request.session.userId && request.session.role !== 'admin') {
      return reply.status(403).send({ success: false, error: 'Nur der Ersteller kann das Spiel starten' });
    }

    const playerCount = await db('lobby_players')
      .where('lobby_id', lobby.id)
      .count('* as count')
      .first();

    if (Number(playerCount?.count) < lobby.min_players) {
      return reply.status(400).send({
        success: false,
        error: `Mindestens ${lobby.min_players} Spieler benoetigt`,
      });
    }

    await db('lobbies').where('id', lobby.id).update({ status: 'laeuft' });

    if (io) {
      io.to(`lobby:${lobby.id}`).emit('lobby:status-changed', {
        lobbyId: lobby.id,
        status: 'laeuft',
      });
    }

    const [gameSession] = await db('game_sessions')
      .insert({
        lobby_id: lobby.id,
        plugin_id: lobby.plugin_id,
      })
      .returning('id');

    return { success: true, data: { gameSessionId: gameSession.id } };
  });

  fastify.post<{
    Params: { id: string };
  }>('/:id/close', { preHandler: requireAdmin }, async (request, reply) => {
    const lobby = await db('lobbies')
      .where('lobbies.id', request.params.id)
      .join('plugins', 'lobbies.plugin_id', 'plugins.id')
      .select(
        'lobbies.id',
        'lobbies.code',
        'lobbies.status',
        'lobbies.plugin_id',
        'plugins.slug as plugin_slug',
        'plugins.name as plugin_name',
      )
      .first();

    if (!lobby) {
      return reply.status(404).send({ success: false, error: 'Lobby nicht gefunden' });
    }

    if (lobby.status !== 'wartend' && lobby.status !== 'laeuft') {
      return reply.status(400).send({ success: false, error: 'Nur aktive Lobbys koennen geschlossen werden' });
    }

    await db.transaction(async (trx) => {
      await trx('lobbies')
        .where('id', lobby.id)
        .update({
          status: 'geschlossen',
          closed_at: trx.fn.now(),
        });

      await trx('game_sessions')
        .where('lobby_id', lobby.id)
        .whereNull('ended_at')
        .update({ ended_at: trx.fn.now() });
    });

    await logAudit(db, request.session.userId!, 'lobby_closed_by_admin', {
      lobbyId: lobby.id,
      code: lobby.code,
      pluginId: lobby.plugin_id,
      pluginSlug: lobby.plugin_slug,
      pluginName: lobby.plugin_name,
      previousStatus: lobby.status,
    });

    if (io) {
      io.to(`lobby:${lobby.id}`).emit(WS_EVENTS.LOBBY_STATUS_CHANGED, {
        lobbyId: lobby.id,
        status: 'geschlossen',
      });
    }

    return { success: true };
  });
}
