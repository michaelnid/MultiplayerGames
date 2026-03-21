import type { FastifyInstance } from 'fastify';
import { db } from '../db/knex.js';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import { config } from '../config.js';
import os from 'node:os';

function normalizeAdminUrl(rawUrl: string): string | null {
  const value = rawUrl.trim();
  if (!value) return null;

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export async function statsRoutes(fastify: FastifyInstance) {
  fastify.get('/admin-overview', { preHandler: requireAdmin }, async () => {
    const [userCount] = await db('users').count('* as count');
    const [pluginCount] = await db('plugins').count('* as count');
    const [lobbyCount] = await db('lobbies')
      .whereIn('status', ['wartend', 'laeuft'])
      .count('* as count');
    const [gameCount] = await db('game_sessions').count('* as count');

    return {
      success: true,
      data: {
        users: Number(userCount.count),
        plugins: Number(pluginCount.count),
        activeLobbies: Number(lobbyCount.count),
        totalGames: Number(gameCount.count),
      },
    };
  });

  fastify.get('/health', async () => {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    return {
      success: true,
      data: {
        version: process.env.CORE_VERSION || '1.0.0',
        uptime: `${hours}h ${minutes}m`,
        memoryUsage: `${Math.round(usedMem / 1024 / 1024)} / ${Math.round(totalMem / 1024 / 1024)} MB`,
        cpuUsage: `${loadAvg[0].toFixed(2)} (1m), ${loadAvg[1].toFixed(2)} (5m)`,
        nodeMemory: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      },
    };
  });

  fastify.get('/db-admin', { preHandler: requireAdmin }, async () => {
    const url = normalizeAdminUrl(config.pgAdminUrl);

    return {
      success: true,
      data: {
        tool: 'pgadmin4',
        enabled: Boolean(url),
        url,
      },
    };
  });

  fastify.get('/audit-log', { preHandler: requireAdmin }, async (request) => {
    const entries = await db('audit_log')
      .leftJoin('users', 'audit_log.user_id', 'users.id')
      .select(
        'audit_log.id',
        'audit_log.user_id as userId',
        'users.username',
        'audit_log.action',
        'audit_log.details',
        'audit_log.created_at as createdAt',
      )
      .orderBy('audit_log.created_at', 'desc')
      .limit(200);

    return {
      success: true,
      data: entries.map((e) => ({
        ...e,
        details: typeof e.details === 'string' ? JSON.parse(e.details) : e.details,
      })),
    };
  });

  fastify.get<{
    Querystring: { pluginSlug?: string; period?: string; limit?: string };
  }>('/leaderboard', { preHandler: requireAuth }, async (request) => {
    const { pluginSlug, period, limit: limitStr } = request.query;
    const limit = Math.min(Number(limitStr) || 25, 100);

    let query = db('player_stats')
      .join('users', 'player_stats.user_id', 'users.id')
      .join('plugins', 'player_stats.plugin_id', 'plugins.id')
      .select(
        'users.id as userId',
        'users.username',
        'plugins.slug as pluginSlug',
        'plugins.name as pluginName',
        'player_stats.wins',
        'player_stats.losses',
        'player_stats.draws',
        'player_stats.total_score as totalScore',
        'player_stats.games_played as gamesPlayed',
      )
      .orderBy('player_stats.total_score', 'desc')
      .limit(limit);

    if (pluginSlug) {
      query = query.where('plugins.slug', pluginSlug);
    }

    if (period === 'woche') {
      query = query.where('player_stats.last_played', '>=', db.raw("NOW() - INTERVAL '7 days'"));
    } else if (period === 'monat') {
      query = query.where('player_stats.last_played', '>=', db.raw("NOW() - INTERVAL '30 days'"));
    }

    const rows = await query;
    return {
      success: true,
      data: rows.map((r, i) => ({ rank: i + 1, ...r })),
    };
  });

  fastify.get('/me', { preHandler: requireAuth }, async (request) => {
    const userId = request.session.userId!;

    const stats = await db('player_stats')
      .where('user_id', userId)
      .join('plugins', 'player_stats.plugin_id', 'plugins.id')
      .select(
        'plugins.slug as pluginSlug',
        'plugins.name as pluginName',
        'player_stats.wins',
        'player_stats.losses',
        'player_stats.draws',
        'player_stats.total_score as totalScore',
        'player_stats.games_played as gamesPlayed',
        'player_stats.last_played as lastPlayed',
      );

    const recentGames = await db('game_sessions')
      .join('lobbies', 'game_sessions.lobby_id', 'lobbies.id')
      .join('lobby_players', 'lobbies.id', 'lobby_players.lobby_id')
      .join('plugins', 'game_sessions.plugin_id', 'plugins.id')
      .where('lobby_players.user_id', userId)
      .select(
        'game_sessions.id',
        'plugins.name as pluginName',
        'game_sessions.started_at as startedAt',
        'game_sessions.ended_at as endedAt',
        'game_sessions.result_data as resultData',
      )
      .orderBy('game_sessions.started_at', 'desc')
      .limit(10);

    const totalWins = stats.reduce((sum, s) => sum + s.wins, 0);
    const totalGames = stats.reduce((sum, s) => sum + s.gamesPlayed, 0);
    const totalScore = stats.reduce((sum, s) => sum + s.totalScore, 0);

    const enrichedGames = recentGames.map((game) => {
      let scoreChange: number | null = null;
      try {
        const data = typeof game.resultData === 'string' ? JSON.parse(game.resultData) : (game.resultData || {});
        if (data.playerResults?.[userId]) {
          scoreChange = data.playerResults[userId].scoreChange ?? null;
        }
      } catch { /* ignore */ }
      return {
        id: game.id,
        pluginName: game.pluginName,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        scoreChange,
      };
    });

    return {
      success: true,
      data: {
        summary: { totalWins, totalGames, totalScore },
        perPlugin: stats,
        recentGames: enrichedGames,
      },
    };
  });
}
