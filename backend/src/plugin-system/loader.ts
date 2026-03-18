import path from 'node:path';
import fs from 'node:fs/promises';
import AdmZip from 'adm-zip';
import type { Knex } from 'knex';
import type { Server } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import type { PluginManifest } from '@mike-games/shared';
import { MAX_PLUGIN_SIZE_BYTES } from '@mike-games/shared';
import { validateManifest } from './manifest.js';
import { createPluginContext, type PluginContext } from './context.js';
import { config } from '../config.js';

const loadedPlugins = new Map<string, { context: PluginContext; manifest: PluginManifest }>();

export function getLoadedPlugins() {
  return loadedPlugins;
}

export async function installPlugin(
  zipBuffer: Buffer,
  db: Knex,
  io: Server,
  fastify: FastifyInstance,
): Promise<{ slug: string; name: string }> {
  if (zipBuffer.length > MAX_PLUGIN_SIZE_BYTES) {
    throw new Error(`Plugin-Datei zu gross (max. ${MAX_PLUGIN_SIZE_BYTES / 1024 / 1024} MB)`);
  }

  const zip = new AdmZip(zipBuffer);
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    throw new Error('manifest.json nicht im ZIP gefunden');
  }

  let manifestData: unknown;
  try {
    manifestData = JSON.parse(manifestEntry.getData().toString('utf8'));
  } catch {
    throw new Error('manifest.json ist kein gueltiges JSON');
  }

  const { valid, error, manifest } = validateManifest(manifestData);
  if (!valid || !manifest) {
    throw new Error(error || 'Ungueltige manifest.json');
  }

  const existing = await db('plugins').where('slug', manifest.slug).first();
  if (existing) {
    throw new Error(`Plugin mit slug "${manifest.slug}" ist bereits installiert`);
  }

  const pluginDir = path.join(config.plugins.directory, manifest.slug);

  try {
    await fs.mkdir(pluginDir, { recursive: true });
    zip.extractAllTo(pluginDir, true);
  } catch (err) {
    await fs.rm(pluginDir, { recursive: true, force: true });
    throw new Error('Fehler beim Entpacken des Plugins');
  }

  const [plugin] = await db('plugins')
    .insert({
      slug: manifest.slug,
      name: manifest.name,
      version: manifest.version,
      author: manifest.author || '',
      manifest: JSON.stringify(manifest),
      enabled: true,
    })
    .returning(['id', 'slug']);

  try {
    await loadPluginBackend(plugin.id, manifest, pluginDir, db, io, fastify);
  } catch (err) {
    // Backend-Laden fehlgeschlagen, aber Plugin ist installiert (deaktiviert)
    await db('plugins').where('id', plugin.id).update({ enabled: false });
  }

  return { slug: manifest.slug, name: manifest.name };
}

export async function loadPluginBackend(
  pluginId: string,
  manifest: PluginManifest,
  pluginDir: string,
  db: Knex,
  io: Server,
  fastify: FastifyInstance,
) {
  const backendEntry = path.join(pluginDir, manifest.backend.entry);

  try {
    await fs.access(backendEntry);
  } catch {
    throw new Error(`Backend-Einstiegspunkt nicht gefunden: ${manifest.backend.entry}`);
  }

  const context = createPluginContext(manifest.slug, pluginId, db, io);

  const pluginModule = await import(backendEntry);
  if (typeof pluginModule.default === 'function') {
    await pluginModule.default(context, fastify);
  } else if (typeof pluginModule.register === 'function') {
    await pluginModule.register(context, fastify);
  }

  loadedPlugins.set(manifest.slug, { context, manifest });
}

export async function uninstallPlugin(pluginId: string, db: Knex) {
  const plugin = await db('plugins').where('id', pluginId).first();
  if (!plugin) {
    throw new Error('Plugin nicht gefunden');
  }

  loadedPlugins.delete(plugin.slug);

  await db('plugin_settings').where('plugin_id', pluginId).delete();
  await db('player_stats').where('plugin_id', pluginId).delete();
  await db('game_sessions').where('plugin_id', pluginId).delete();
  await db('lobbies').where('plugin_id', pluginId).delete();
  await db('plugins').where('id', pluginId).delete();

  const pluginDir = path.join(config.plugins.directory, plugin.slug);
  await fs.rm(pluginDir, { recursive: true, force: true });
}

export async function loadAllPlugins(db: Knex, io: Server, fastify: FastifyInstance) {
  const plugins = await db('plugins').where('enabled', true);

  for (const plugin of plugins) {
    const manifest = typeof plugin.manifest === 'string' ? JSON.parse(plugin.manifest) : plugin.manifest;
    const pluginDir = path.join(config.plugins.directory, plugin.slug);

    try {
      await loadPluginBackend(plugin.id, manifest, pluginDir, db, io, fastify);
    } catch (err) {
      console.error(`Plugin "${plugin.slug}" konnte nicht geladen werden:`, err);
    }
  }
}
