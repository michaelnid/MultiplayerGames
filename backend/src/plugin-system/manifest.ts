import type { PluginManifest } from '@mike-games/shared';
import { CORE_VERSION } from '@mike-games/shared';
import semver from 'semver';

const REQUIRED_FIELDS: (keyof PluginManifest)[] = [
  'slug', 'name', 'version', 'description', 'minPlayers', 'maxPlayers', 'frontend', 'backend',
];

export function validateManifest(data: unknown): { valid: boolean; error?: string; manifest?: PluginManifest } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'manifest.json ist kein gueltiges JSON-Objekt' };
  }

  const obj = data as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj)) {
      return { valid: false, error: `Pflichtfeld "${field}" fehlt in manifest.json` };
    }
  }

  if (typeof obj.slug !== 'string' || !/^[a-z0-9-]+$/.test(obj.slug)) {
    return { valid: false, error: 'slug muss aus Kleinbuchstaben, Zahlen und Bindestrichen bestehen' };
  }

  if (obj.slug.length < 2 || obj.slug.length > 64) {
    return { valid: false, error: 'slug muss zwischen 2 und 64 Zeichen lang sein' };
  }

  if (typeof obj.minPlayers !== 'number' || obj.minPlayers < 1) {
    return { valid: false, error: 'minPlayers muss mindestens 1 sein' };
  }

  if (typeof obj.maxPlayers !== 'number' || obj.maxPlayers < obj.minPlayers) {
    return { valid: false, error: 'maxPlayers muss groesser oder gleich minPlayers sein' };
  }

  if (obj.coreVersion && typeof obj.coreVersion === 'string') {
    if (!semver.satisfies(CORE_VERSION, obj.coreVersion)) {
      return {
        valid: false,
        error: `Plugin erfordert Core-Version ${obj.coreVersion}, installiert ist ${CORE_VERSION}`,
      };
    }
  }

  const frontend = obj.frontend as Record<string, unknown> | undefined;
  if (!frontend?.entry || typeof frontend.entry !== 'string') {
    return { valid: false, error: 'frontend.entry muss ein String sein' };
  }

  const backend = obj.backend as Record<string, unknown> | undefined;
  if (!backend?.entry || typeof backend.entry !== 'string') {
    return { valid: false, error: 'backend.entry muss ein String sein' };
  }

  return { valid: true, manifest: data as PluginManifest };
}
