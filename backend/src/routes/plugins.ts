import type { FastifyInstance } from 'fastify';
import { db } from '../db/knex.js';
import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { logAudit } from '../auth/audit.js';
import { installPlugin, uninstallPlugin, getLoadedPlugins } from '../plugin-system/loader.js';

let ioRef: any = null;

export function setPluginIO(io: any) {
  ioRef = io;
}

export async function pluginRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: requireAdmin }, async () => {
    const plugins = await db('plugins').orderBy('installed_at', 'desc');
    return {
      success: true,
      data: plugins.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        version: p.version,
        author: p.author,
        manifest: typeof p.manifest === 'string' ? JSON.parse(p.manifest) : p.manifest,
        enabled: p.enabled,
        installedAt: p.installed_at,
      })),
    };
  });

  fastify.get('/active', async () => {
    const plugins = await db('plugins').where('enabled', true).orderBy('name', 'asc');
    return {
      success: true,
      data: plugins.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        version: p.version,
        author: p.author,
        manifest: typeof p.manifest === 'string' ? JSON.parse(p.manifest) : p.manifest,
        enabled: p.enabled,
        installedAt: p.installed_at,
      })),
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
      await uninstallPlugin(id, db);
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
      result[row.key.replace('settings:', '')] = row.value;
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
