<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <p class="text-muted">Willkommen, {{ auth.user?.username }}!</p>

    <div class="dashboard-grid">
      <div class="card stat-card">
        <span class="stat-value">{{ myStats.totalGames }}</span>
        <span class="stat-label">Gespielte Spiele</span>
      </div>
      <div class="card stat-card">
        <span class="stat-value">{{ myStats.totalWins }}</span>
        <span class="stat-label">Siege</span>
      </div>
      <div class="card stat-card">
        <span class="stat-value">{{ activeLobbies }}</span>
        <span class="stat-label">Aktive Lobbys</span>
      </div>
      <div class="card stat-card">
        <span class="stat-value">{{ myStats.totalScore }}</span>
        <span class="stat-label">Gesamtpunkte</span>
      </div>
    </div>

    <div class="card">
      <h2>Letzte Spiele</h2>
      <div v-if="recentGames.length === 0" class="text-muted">Noch keine Spiele gespielt.</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Spiel</th>
            <th>Gestartet</th>
            <th>Beendet</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="game in recentGames" :key="game.id">
            <td>{{ game.pluginName }}</td>
            <td>{{ formatDate(game.startedAt) }}</td>
            <td>{{ game.endedAt ? formatDate(game.endedAt) : 'Laeuft' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';

const auth = useAuthStore();

const myStats = ref({ totalWins: 0, totalGames: 0, totalScore: 0 });
const activeLobbies = ref(0);
const recentGames = ref<{ id: string; pluginName: string; startedAt: string; endedAt: string | null }[]>([]);

onMounted(async () => {
  try {
    const statsResult = await api.get<{
      summary: { totalWins: number; totalGames: number; totalScore: number };
      recentGames: { id: string; pluginName: string; startedAt: string; endedAt: string | null }[];
    }>('/stats/me');
    if (statsResult.data) {
      myStats.value = statsResult.data.summary;
      recentGames.value = statsResult.data.recentGames;
    }
  } catch { /* Noch keine Statistiken */ }

  try {
    const lobbiesResult = await api.get<unknown[]>('/lobbies');
    activeLobbies.value = lobbiesResult.data?.length ?? 0;
  } catch { /* Keine Lobbys */ }
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style scoped>
.dashboard h1 { margin-bottom: 0.25rem; }
.text-muted { color: var(--color-text-muted); margin-bottom: 1.5rem; }

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card { text-align: center; padding: 1.25rem; }
.stat-value { display: block; font-size: 2rem; font-weight: 700; color: var(--color-primary); }
.stat-label { font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

h2 { margin-bottom: 0.75rem; font-size: 1.1rem; }

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.data-table th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}
</style>
