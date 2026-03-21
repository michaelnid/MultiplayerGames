import type { Knex } from 'knex';

interface SessionData {
  [key: string]: unknown;
}

export class PgSessionStore {
  private db: Knex;
  private tableName = 'sessions';

  constructor(db: Knex) {
    this.db = db;
  }

  async get(sid: string): Promise<[SessionData, number | null] | null> {
    const row = await this.db(this.tableName)
      .where('sid', sid)
      .where('expires_at', '>', this.db.fn.now())
      .first();

    if (!row) return null;

    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    const expiry = row.expires_at ? new Date(row.expires_at).getTime() : null;
    return [data, expiry];
  }

  async set(sid: string, session: SessionData, expiry?: number | null): Promise<void> {
    const expiresAt = expiry ? new Date(expiry) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const data = JSON.stringify(session);
    const userId = (session as Record<string, unknown>).userId as string | undefined;

    const existing = await this.db(this.tableName).where('sid', sid).first();

    if (existing) {
      await this.db(this.tableName)
        .where('sid', sid)
        .update({ data, expires_at: expiresAt, user_id: userId || null });
    } else {
      await this.db(this.tableName)
        .insert({ sid, data, expires_at: expiresAt, user_id: userId || null });
    }
  }

  async destroy(sid: string): Promise<void> {
    await this.db(this.tableName).where('sid', sid).delete();
  }
}
