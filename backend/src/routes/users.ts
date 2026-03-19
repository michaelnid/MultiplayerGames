import type { FastifyInstance } from 'fastify';
import { db } from '../db/knex.js';
import { requireAdmin, requireAuth } from '../auth/middleware.js';
import { hashPassword } from '../auth/password.js';
import { logAudit } from '../auth/audit.js';
import type { UserRole } from '@mike-games/shared';
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  USER_ROLES,
} from '@mike-games/shared';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: requireAdmin }, async (request) => {
    const users = await db('users')
      .select('id', 'username', 'role', 'totp_enabled', 'created_at', 'updated_at')
      .orderBy('created_at', 'asc');

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        totpEnabled: u.totp_enabled,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })),
    };
  });

  fastify.post<{
    Body: { username: string; password: string; role: UserRole };
  }>('/', {
    preHandler: requireAdmin,
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password', 'role'],
        properties: {
          username: {
            type: 'string',
            minLength: USERNAME_MIN_LENGTH,
            maxLength: USERNAME_MAX_LENGTH,
            pattern: '^[a-zA-Z0-9_-]+$',
          },
          password: {
            type: 'string',
            minLength: PASSWORD_MIN_LENGTH,
            maxLength: PASSWORD_MAX_LENGTH,
          },
          role: { type: 'string', enum: [...USER_ROLES] },
        },
      },
    },
  }, async (request, reply) => {
    const { username, password, role } = request.body;
    const normalizedUsername = username.toLowerCase().trim();

    const existing = await db('users').where('username', normalizedUsername).first();
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Benutzername bereits vergeben' });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db('users')
      .insert({
        username: normalizedUsername,
        password_hash: passwordHash,
        role,
      })
      .returning(['id', 'username', 'role', 'created_at']);

    await logAudit(db, request.session.userId!, 'user_created', {
      targetUser: normalizedUsername,
      role,
    });

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
      },
    };
  });

  fastify.put<{
    Params: { id: string };
    Body: { role?: UserRole; password?: string; disable2fa?: boolean };
  }>('/:id', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
      body: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: [...USER_ROLES] },
          password: { type: 'string', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
          disable2fa: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { role, password, disable2fa } = request.body;

    const user = await db('users').where('id', id).first();
    if (!user) {
      return reply.status(404).send({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const updates: Record<string, unknown> = { updated_at: db.fn.now() };

    if (role) {
      updates.role = role;
      await logAudit(db, request.session.userId!, 'role_changed', {
        targetUser: user.username,
        oldRole: user.role,
        newRole: role,
      });
    }

    if (password) {
      updates.password_hash = await hashPassword(password);
      await logAudit(db, request.session.userId!, 'password_reset', {
        targetUser: user.username,
      });
    }

    if (disable2fa) {
      updates.totp_enabled = false;
      updates.totp_secret = null;
      await logAudit(db, request.session.userId!, '2fa_disabled_by_admin', {
        targetUser: user.username,
      });
    }

    await db('users').where('id', id).update(updates);
    return { success: true };
  });

  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;

    if (id === request.session.userId) {
      return reply.status(400).send({ success: false, error: 'Eigenen Account kann man nicht loeschen' });
    }

    const user = await db('users').where('id', id).first();
    if (!user) {
      return reply.status(404).send({ success: false, error: 'Benutzer nicht gefunden' });
    }

    await db('users').where('id', id).delete();
    await logAudit(db, request.session.userId!, 'user_deleted', {
      targetUser: user.username,
    });

    return { success: true };
  });
}
