import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  domain: process.env.DOMAIN || '',
  coreVersion: process.env.CORE_VERSION || '1.0.0',
  pgAdminUrl: process.env.PGADMIN_URL?.trim() || process.env.PHPMYADMIN_URL?.trim() || '',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'mike_games',
    user: process.env.DB_USER || 'mike_games',
    password: process.env.DB_PASSWORD || '',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'dev-secret-aendern-in-produktion',
    maxAge: 24 * 60 * 60 * 1000,
  },

  rateLimit: {
    login: { max: 5, windowMs: 15 * 60 * 1000 },
    api: { max: 100, windowMs: 60 * 1000 },
  },

  plugins: {
    maxUploadSize: 50 * 1024 * 1024,
    directory: new URL('../../plugins', import.meta.url).pathname,
  },
} as const;
