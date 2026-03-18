import type { Knex } from 'knex';

export async function generateLobbyCode(db: Knex): Promise<string> {
  const maxAttempts = 50;

  for (let i = 0; i < maxAttempts; i++) {
    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

    const existing = await db('lobbies')
      .where('code', code)
      .whereIn('status', ['wartend', 'laeuft'])
      .first();

    if (!existing) return code;
  }

  throw new Error('Kein freier Lobby-Code verfuegbar. Bitte spaeter erneut versuchen.');
}
