import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '@mike-games/shared';

declare module 'fastify' {
  interface Session {
    userId?: string;
    username?: string;
    role?: UserRole;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.status(401).send({ success: false, error: 'Nicht authentifiziert' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.session?.userId) {
      return reply.status(401).send({ success: false, error: 'Nicht authentifiziert' });
    }
    if (!request.session.role || !roles.includes(request.session.role)) {
      return reply.status(403).send({ success: false, error: 'Keine Berechtigung' });
    }
  };
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.status(401).send({ success: false, error: 'Nicht authentifiziert' });
  }
  if (request.session.role !== 'admin') {
    return reply.status(403).send({ success: false, error: 'Keine Berechtigung' });
  }
}

export async function requireGameMasterOrAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.session?.userId) {
    return reply.status(401).send({ success: false, error: 'Nicht authentifiziert' });
  }
  if (request.session.role !== 'admin' && request.session.role !== 'gamemaster') {
    return reply.status(403).send({ success: false, error: 'Keine Berechtigung' });
  }
}
