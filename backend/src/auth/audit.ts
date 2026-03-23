import type { Knex } from 'knex';

export async function logAudit(
  db: Knex,
  userId: string | null,
  action: string,
  details: Record<string, unknown> = {},
) {
  await db('audit_log').insert({
    user_id: userId,
    action,
    details: JSON.stringify(details),
  });
}
