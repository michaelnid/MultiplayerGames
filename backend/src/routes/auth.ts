import type { FastifyInstance } from 'fastify';
import { db } from '../db/knex.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import { logAudit } from '../auth/audit.js';
import {
  generateTOTPSecret,
  verifyTOTP,
  generateQRCodeDataURL,
  generateBackupCodes,
  verifyBackupCode,
} from '../auth/totp.js';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@mike-games/shared';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{
    Body: { username: string; password: string; totpCode?: string };
  }>('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: 15 * 60 * 1000 },
    },
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
          totpCode: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { username, password, totpCode } = request.body;

    const user = await db('users')
      .where('username', username.toLowerCase().trim())
      .first();

    if (!user) {
      return reply.status(401).send({ success: false, error: 'Ungueltige Anmeldedaten' });
    }

    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      await logAudit(db, user.id, 'login_failed', { username: user.username });
      return reply.status(401).send({ success: false, error: 'Ungueltige Anmeldedaten' });
    }

    if (user.totp_enabled && user.totp_secret) {
      if (!totpCode) {
        return reply.status(200).send({
          success: true,
          data: { requiresTOTP: true },
        });
      }

      const totpValid = verifyTOTP(user.totp_secret, totpCode);
      if (!totpValid) {
        const backupCodes: string[] = user.backup_codes ? JSON.parse(user.backup_codes) : [];
        const backupResult = verifyBackupCode(backupCodes, totpCode);

        if (!backupResult.valid) {
          await logAudit(db, user.id, 'login_2fa_failed', { username: user.username });
          return reply.status(401).send({ success: false, error: 'Ungueltiger 2FA-Code' });
        }

        await db('users').where('id', user.id).update({
          backup_codes: JSON.stringify(backupResult.remaining),
        });
      }
    }

    request.session.userId = user.id;
    request.session.username = user.username;
    request.session.role = user.role;

    await logAudit(db, user.id, 'login', { username: user.username });

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        totpEnabled: user.totp_enabled,
      },
    };
  });

  fastify.post('/logout', { preHandler: requireAuth }, async (request) => {
    const userId = request.session.userId!;
    await logAudit(db, userId, 'logout', {});
    request.session.destroy();
    return { success: true };
  });

  fastify.get('/me', { preHandler: requireAuth }, async (request) => {
    const user = await db('users')
      .where('id', request.session.userId)
      .select('id', 'username', 'role', 'totp_enabled', 'created_at')
      .first();

    if (!user) {
      request.session.destroy();
      return { success: false, error: 'Benutzer nicht gefunden' };
    }

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        totpEnabled: user.totp_enabled,
        createdAt: user.created_at,
      },
    };
  });

  fastify.put<{
    Body: { currentPassword: string; newPassword: string };
  }>('/password', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH },
        },
      },
    },
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body;
    const userId = request.session.userId!;

    const user = await db('users').where('id', userId).first();
    if (!user) {
      return reply.status(404).send({ success: false, error: 'Benutzer nicht gefunden' });
    }

    const valid = await verifyPassword(user.password_hash, currentPassword);
    if (!valid) {
      return reply.status(400).send({ success: false, error: 'Aktuelles Passwort ist falsch' });
    }

    const newHash = await hashPassword(newPassword);
    await db('users').where('id', userId).update({
      password_hash: newHash,
      updated_at: db.fn.now(),
    });

    await logAudit(db, userId, 'password_changed', {});
    return { success: true };
  });

  // 2FA einrichten - Schritt 1: Secret generieren
  fastify.post('/2fa/setup', { preHandler: requireAuth }, async (request) => {
    const userId = request.session.userId!;
    const user = await db('users').where('id', userId).first();

    if (user.totp_enabled) {
      return { success: false, error: '2FA ist bereits aktiviert' };
    }

    const { secret, uri } = generateTOTPSecret(user.username);
    const qrCode = await generateQRCodeDataURL(uri);

    // Secret temporaer in der Session speichern bis zur Verifizierung
    (request.session as any).pendingTotpSecret = secret;

    return {
      success: true,
      data: { qrCode, secret },
    };
  });

  // 2FA einrichten - Schritt 2: Verifizieren und aktivieren
  fastify.post<{
    Body: { totpCode: string };
  }>('/2fa/verify', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['totpCode'],
        properties: { totpCode: { type: 'string', minLength: 6, maxLength: 6 } },
      },
    },
  }, async (request, reply) => {
    const userId = request.session.userId!;
    const pendingSecret = (request.session as any).pendingTotpSecret;

    if (!pendingSecret) {
      return reply.status(400).send({ success: false, error: '2FA-Setup nicht gestartet' });
    }

    const valid = verifyTOTP(pendingSecret, request.body.totpCode);
    if (!valid) {
      return reply.status(400).send({ success: false, error: 'Ungueltiger Code. Bitte erneut versuchen.' });
    }

    const backupCodes = generateBackupCodes();

    await db('users').where('id', userId).update({
      totp_enabled: true,
      totp_secret: pendingSecret,
      backup_codes: JSON.stringify(backupCodes),
      updated_at: db.fn.now(),
    });

    delete (request.session as any).pendingTotpSecret;
    await logAudit(db, userId, '2fa_enabled', {});

    return {
      success: true,
      data: { backupCodes },
    };
  });

  // 2FA deaktivieren
  fastify.post<{
    Body: { password: string };
  }>('/2fa/disable', {
    preHandler: requireAuth,
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: { password: { type: 'string', minLength: 1 } },
      },
    },
  }, async (request, reply) => {
    const userId = request.session.userId!;
    const user = await db('users').where('id', userId).first();

    const valid = await verifyPassword(user.password_hash, request.body.password);
    if (!valid) {
      return reply.status(400).send({ success: false, error: 'Falsches Passwort' });
    }

    await db('users').where('id', userId).update({
      totp_enabled: false,
      totp_secret: null,
      backup_codes: null,
      updated_at: db.fn.now(),
    });

    await logAudit(db, userId, '2fa_disabled', {});
    return { success: true };
  });

  // Admin: 2FA fuer Benutzer erzwingen/zuruecksetzen
  fastify.post<{
    Params: { userId: string };
    Body: { action: 'reset' };
  }>('/2fa/admin/:userId', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: { userId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const targetUser = await db('users').where('id', request.params.userId).first();
    if (!targetUser) {
      return reply.status(404).send({ success: false, error: 'Benutzer nicht gefunden' });
    }

    await db('users').where('id', request.params.userId).update({
      totp_enabled: false,
      totp_secret: null,
      backup_codes: null,
      updated_at: db.fn.now(),
    });

    await logAudit(db, request.session.userId!, '2fa_admin_reset', {
      targetUser: targetUser.username,
    });

    return { success: true };
  });
}
