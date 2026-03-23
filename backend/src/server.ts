import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { db } from './db/knex.js';
import { PgSessionStore } from './session-store.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { lobbyRoutes, setLobbyIO } from './routes/lobbies.js';
import { pluginRoutes, setPluginIO } from './routes/plugins.js';
import { statsRoutes } from './routes/stats.js';
import { setupWebSocket } from './ws/index.js';
import { loadAllPlugins } from './plugin-system/loader.js';
import { startLobbyTimeoutChecker, stopLobbyTimeoutChecker } from './lobby/timeout.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const isDevelopment = config.env === 'development';
  const allowedDomainOrigin = config.domain ? `https://${config.domain}` : null;

  const fastify = Fastify({
    logger: {
      level: isDevelopment ? 'info' : 'warn',
    },
    trustProxy: true,
  });

  await fastify.register(fastifyCors, {
    origin: isDevelopment ? true : (allowedDomainOrigin ? [allowedDomainOrigin] : false),
    credentials: isDevelopment || !!allowedDomainOrigin,
  });

  await fastify.register(fastifyCookie);

  await fastify.register(fastifySession, {
    secret: config.session.secret,
    store: new PgSessionStore(db) as unknown as Parameters<typeof fastifySession>[1] extends { store?: infer S } ? S : never,
    cookie: {
      maxAge: config.session.maxAge,
      secure: config.env === 'production' && !!config.domain,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    saveUninitialized: false,
  });

  await fastify.register(fastifyRateLimit, {
    global: false,
  });

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: config.plugins.maxUploadSize,
    },
  });

  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  await fastify.register(fastifyStatic, {
    root: frontendDist,
    prefix: '/',
  });

  const pluginsDir = path.resolve(__dirname, '../../plugins');
  await fastify.register(fastifyStatic, {
    root: pluginsDir,
    prefix: '/plugins/',
    decorateReply: false,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    },
  });

  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(lobbyRoutes, { prefix: '/api/lobbies' });
  await fastify.register(pluginRoutes, { prefix: '/api/plugins' });
  await fastify.register(statsRoutes, { prefix: '/api/stats' });

  fastify.get('/api/health', async () => {
    return { status: 'ok', version: config.coreVersion };
  });

  fastify.get('/favicon.ico', async (_request, reply) => {
    return reply.redirect('/favicon.svg');
  });

  fastify.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ success: false, error: 'Route nicht gefunden' });
    }
    return reply.sendFile('index.html', frontendDist);
  });

  await fastify.ready();

  const ioOptions: ConstructorParameters<typeof Server>[1] = {
    path: '/ws/',
  };

  if (isDevelopment) {
    ioOptions.cors = {
      origin: true,
      credentials: true,
    };
  } else if (allowedDomainOrigin) {
    ioOptions.cors = {
      origin: [allowedDomainOrigin],
      credentials: true,
    };
  }

  const io = new Server(fastify.server, ioOptions);

  setPluginIO(io);
  setLobbyIO(io);
  setupWebSocket(io, db);

  try {
    await loadAllPlugins(db, io, fastify);
    fastify.log.info('Plugins geladen');
  } catch (err) {
    fastify.log.error(`Fehler beim Laden der Plugins: ${err}`);
  }

  startLobbyTimeoutChecker(db);

  await fastify.listen({ port: config.port, host: config.host });
  fastify.log.info(`Server laeuft auf ${config.host}:${config.port}`);

  const shutdown = async () => {
    fastify.log.info('Server wird heruntergefahren...');
    stopLobbyTimeoutChecker();
    io.close();
    await fastify.close();
    await db.destroy();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Server-Start fehlgeschlagen:', err);
  process.exit(1);
});
