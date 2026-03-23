import type { FastifyInstance } from 'fastify';
import type { PluginManifest } from '@mike-games/shared';
import { db } from '../db/knex.js';
import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { logAudit } from '../auth/audit.js';
import { installPlugin, uninstallPlugin, loadPluginBackend, unloadPlugin, getLoadedPlugins } from '../plugin-system/loader.js';
import { config } from '../config.js';
import path from 'node:path';
import { parseJsonObject, parseJsonValue } from '../utils/json.js';

let ioRef: any = null;

export function setPluginIO(io: any) {
  ioRef = io;
}

function parsePlayerNumber(value: unknown): number | null {
  const parsed = Number(parseJsonValue(value));
  return Number.isFinite(parsed) ? Math.floor(parsed) : null;
}

function resolveEffectivePlayers(
  manifest: Record<string, unknown>,
  minSetting?: unknown,
  maxSetting?: unknown,
): { minPlayers: number; maxPlayers: number } {
  const manifestMin = parsePlayerNumber(manifest.minPlayers);
  const manifestMax = parsePlayerNumber(manifest.maxPlayers);

  const fallbackMin = manifestMin && manifestMin >= 1 ? manifestMin : 2;
  const fallbackMax = manifestMax && manifestMax >= fallbackMin ? manifestMax : Math.max(8, fallbackMin);

  const configuredMin = minSetting !== undefined ? parsePlayerNumber(minSetting) : null;
  const configuredMax = maxSetting !== undefined ? parsePlayerNumber(maxSetting) : null;

  const effectiveMin = configuredMin && configuredMin >= 1 ? configuredMin : fallbackMin;
  const rawEffectiveMax = configuredMax && configuredMax >= 1 ? configuredMax : fallbackMax;
  const effectiveMax = Math.max(effectiveMin, rawEffectiveMax);

  return { minPlayers: effectiveMin, maxPlayers: effectiveMax };
}

async function loadPlayerSettingsMap(pluginIds: string[]) {
  if (pluginIds.length === 0) {
    return new Map<string, { minSetting?: unknown; maxSetting?: unknown }>();
  }

  const rows = await db('plugin_settings')
    .whereIn('plugin_id', pluginIds)
    .whereIn('key', ['settings:minPlayers', 'settings:maxPlayers'])
    .select('plugin_id', 'key', 'value');

  const settingMap = new Map<string, { minSetting?: unknown; maxSetting?: unknown }>();
  for (const row of rows) {
    const current = settingMap.get(row.plugin_id) ?? {};
    if (row.key === 'settings:minPlayers') {
      current.minSetting = row.value;
    } else if (row.key === 'settings:maxPlayers') {
      current.maxSetting = row.value;
    }
    settingMap.set(row.plugin_id, current);
  }

  return settingMap;
}

export async function pluginRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: requireAdmin }, async () => {
    const plugins = await db('plugins').orderBy('installed_at', 'desc');
    const playerSettingsMap = await loadPlayerSettingsMap(plugins.map((plugin) => plugin.id));

    return {
      success: true,
      data: plugins.map((p) => {
        const manifest = parseJsonObject(p.manifest);
        const settings = playerSettingsMap.get(p.id);
        const effectivePlayers = resolveEffectivePlayers(manifest, settings?.minSetting, settings?.maxSetting);

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          version: p.version,
          author: p.author,
          manifest,
          effectiveMinPlayers: effectivePlayers.minPlayers,
          effectiveMaxPlayers: effectivePlayers.maxPlayers,
          enabled: p.enabled,
          installedAt: p.installed_at,
        };
      }),
    };
  });

  fastify.get('/active', async () => {
    const plugins = await db('plugins').where('enabled', true).orderBy('name', 'asc');
    const playerSettingsMap = await loadPlayerSettingsMap(plugins.map((plugin) => plugin.id));

    return {
      success: true,
      data: plugins.map((p) => {
        const manifest = parseJsonObject(p.manifest);
        const settings = playerSettingsMap.get(p.id);
        const effectivePlayers = resolveEffectivePlayers(manifest, settings?.minSetting, settings?.maxSetting);

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          version: p.version,
          author: p.author,
          manifest,
          effectiveMinPlayers: effectivePlayers.minPlayers,
          effectiveMaxPlayers: effectivePlayers.maxPlayers,
          enabled: p.enabled,
          installedAt: p.installed_at,
        };
      }),
    };
  });

  fastify.post('/install', { preHandler: requireAdmin }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ success: false, error: 'Keine Datei hochgeladen' });
    }

    if (!file.filename.endsWith('.zip')) {
      return reply.status(400).send({ success: false, error: 'Nur ZIP-Dateien erlaubt' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    try {
      const result = await installPlugin(buffer, db, ioRef, fastify);
      await logAudit(db, request.session.userId!, 'plugin_installed', {
        slug: result.slug,
        name: result.name,
      });
      return { success: true, data: result };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Installation fehlgeschlagen';
      return reply.status(400).send({ success: false, error: msg });
    }
  });

  fastify.put<{
    Params: { id: string };
    Body: { enabled?: boolean };
  }>('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { enabled } = request.body;

    const plugin = await db('plugins').where('id', id).first();
    if (!plugin) {
      return reply.status(404).send({ success: false, error: 'Plugin nicht gefunden' });
    }

    if (typeof enabled === 'boolean') {
      await db('plugins').where('id', id).update({ enabled });

      if (enabled && !getLoadedPlugins().has(plugin.slug)) {
        try {
          const manifest = parseJsonObject(plugin.manifest) as unknown as PluginManifest;
          const pluginDir = path.join(config.plugins.directory, plugin.slug);
          await loadPluginBackend(id, manifest, pluginDir, db, ioRef, fastify);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Laden fehlgeschlagen';
          return reply.status(500).send({ success: false, error: `Plugin aktiviert, aber Laden fehlgeschlagen: ${msg}` });
        }
      } else if (!enabled && getLoadedPlugins().has(plugin.slug)) {
        unloadPlugin(plugin.slug, id);
      }

      await logAudit(db, request.session.userId!, enabled ? 'plugin_enabled' : 'plugin_disabled', {
        slug: plugin.slug,
      });
    }

    return { success: true };
  });

  fastify.delete<{
    Params: { id: string };
  }>('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params;

    const plugin = await db('plugins').where('id', id).first();
    if (!plugin) {
      return reply.status(404).send({ success: false, error: 'Plugin nicht gefunden' });
    }

    try {
      await uninstallPlugin(id, db, ioRef);
      await logAudit(db, request.session.userId!, 'plugin_uninstalled', {
        slug: plugin.slug,
        name: plugin.name,
      });
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Deinstallation fehlgeschlagen';
      return reply.status(500).send({ success: false, error: msg });
    }
  });

  fastify.get<{
    Params: { slug: string };
  }>('/:slug/settings', { preHandler: requireAdmin }, async (request, reply) => {
    const plugin = await db('plugins').where('slug', request.params.slug).first();
    if (!plugin) {
      return reply.status(404).send({ success: false, error: 'Plugin nicht gefunden' });
    }

    const settings = await db('plugin_settings')
      .where('plugin_id', plugin.id)
      .andWhere('key', 'like', 'settings:%');

    const result: Record<string, unknown> = {};
    for (const row of settings) {
      result[row.key.replace('settings:', '')] = parseJsonValue(row.value);
    }

    return { success: true, data: result };
  });

  fastify.put<{
    Params: { slug: string };
    Body: { key: string; value: unknown };
  }>('/:slug/settings', { preHandler: requireAdmin }, async (request, reply) => {
    const plugin = await db('plugins').where('slug', request.params.slug).first();
    if (!plugin) {
      return reply.status(404).send({ success: false, error: 'Plugin nicht gefunden' });
    }

    const { key, value } = request.body;
    const dbKey = `settings:${key}`;

    const existing = await db('plugin_settings')
      .where({ plugin_id: plugin.id, key: dbKey })
      .first();

    if (existing) {
      await db('plugin_settings')
        .where({ plugin_id: plugin.id, key: dbKey })
        .update({ value: JSON.stringify(value), updated_at: db.fn.now() });
    } else {
      await db('plugin_settings').insert({
        plugin_id: plugin.id,
        key: dbKey,
        value: JSON.stringify(value),
      });
    }

    return { success: true };
  });
}
