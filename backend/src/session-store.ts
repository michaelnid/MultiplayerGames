import type { Knex } from 'knex';

export class PgSessionStore {
  private db: Knex;
  private tableName = 'sessions';

  constructor(db: Knex) {
    this.db = db;
  }

  set(sid: string, session: Record<string, unknown>, callback: (err?: unknown) => void): void {
    const expiresAt = (session.cookie as any)?.expires
      ? new Date((session.cookie as any).expires)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const data = JSON.stringify(session);
    const userId = session.userId as string | undefined;

    (async () => {
      const existing = await this.db(this.tableName).where('sid', sid).first();
      if (existing) {
        await this.db(this.tableName)
          .where('sid', sid)
          .update({ data, expires_at: expiresAt, user_id: userId || null });
      } else {
        await this.db(this.tableName)
          .insert({ sid, data, expires_at: expiresAt, user_id: userId || null });
      }
    })()
      .then(() => callback())
      .catch((err) => callback(err));
  }

  get(sid: string, callback: (err: unknown, session?: Record<string, unknown> | null) => void): void {
    this.db(this.tableName)
      .where('sid', sid)
      .where('expires_at', '>', this.db.fn.now())
      .first()
      .then((row) => {
        if (!row) return callback(null, null);
        const session = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        callback(null, session);
      })
      .catch((err) => callback(err));
  }

  destroy(sid: string, callback: (err?: unknown) => void): void {
    this.db(this.tableName).where('sid', sid).delete()
      .then(() => callback())
      .catch((err) => callback(err));
  }
}
