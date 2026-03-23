import type { Knex } from 'knex';
import { LOBBY_TIMEOUT_MS } from '@mike-games/shared';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startLobbyTimeoutChecker(db: Knex) {
  if (intervalId) return;

  intervalId = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - LOBBY_TIMEOUT_MS);

      await db('lobbies')
        .where('status', 'wartend')
        .where('created_at', '<', cutoff)
        .update({ status: 'geschlossen', closed_at: db.fn.now() });
    } catch (err) {
      console.error('Lobby-Timeout-Check fehlgeschlagen:', err);
    }
  }, 60_000);
}

export function stopLobbyTimeoutChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
