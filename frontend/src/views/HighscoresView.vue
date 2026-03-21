<template>
  <div class="highscores">
    <h1>Highscores</h1>

    <div v-if="loading" class="loading">Lade Highscores...</div>

    <template v-else>
      <div class="records-grid" v-if="records">
        <div class="record-card" v-if="records.mostWins">
          <div class="record-icon">&#127942;</div>
          <div class="record-info">
            <span class="record-label">Meiste Siege</span>
            <span class="record-value">{{ records.mostWins.username }}</span>
            <span class="record-detail">{{ records.mostWins.value }} Siege</span>
          </div>
        </div>
        <div class="record-card" v-if="records.highestScore">
          <div class="record-icon">&#11088;</div>
          <div class="record-info">
            <span class="record-label">Hoechster Score</span>
            <span class="record-value">{{ records.highestScore.username }}</span>
            <span class="record-detail">{{ records.highestScore.value }} Punkte</span>
          </div>
        </div>
        <div class="record-card" v-if="records.bestWinrate">
          <div class="record-icon">&#127919;</div>
          <div class="record-info">
            <span class="record-label">Beste Winrate</span>
            <span class="record-value">{{ records.bestWinrate.username }}</span>
            <span class="record-detail">{{ records.bestWinrate.value }}% (min. 5 Spiele)</span>
          </div>
        </div>
        <div class="record-card" v-if="records.mostGames">
          <div class="record-icon">&#127918;</div>
          <div class="record-info">
            <span class="record-label">Meiste Spiele</span>
            <span class="record-value">{{ records.mostGames.username }}</span>
            <span class="record-detail">{{ records.mostGames.value }} Spiele</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2>Rangliste</h2>
          <div class="filter-row">
            <select v-model="selectedPlugin" @change="loadLeaderboard" class="filter-select">
              <option value="">Alle Spiele</option>
              <option v-for="p in plugins" :key="p.slug" :value="p.slug">{{ p.name }}</option>
            </select>
            <select v-model="selectedPeriod" @change="loadLeaderboard" class="filter-select">
              <option value="">Gesamt</option>
              <option value="monat">Letzter Monat</option>
              <option value="woche">Letzte Woche</option>
            </select>
          </div>
        </div>

        <div class="card">
          <table class="leaderboard-table" v-if="leaderboard.length">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th>Spieler</th>
                <th v-if="!selectedPlugin">Spiel</th>
                <th class="col-num">Siege</th>
                <th class="col-num">Spiele</th>
                <th class="col-num">Winrate</th>
                <th class="col-num">Punkte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in leaderboard" :key="entry.userId + entry.pluginSlug" :class="{ 'is-me': entry.userId === myUserId }">
                <td class="col-rank">{{ entry.rank }}</td>
                <td class="col-name">{{ entry.username }}</td>
                <td v-if="!selectedPlugin" class="col-game">{{ entry.pluginName }}</td>
                <td class="col-num">{{ entry.wins }}</td>
                <td class="col-num">{{ entry.gamesPlayed }}</td>
                <td class="col-num">{{ entry.gamesPlayed > 0 ? Math.round(entry.wins / entry.gamesPlayed * 100) : 0 }}%</td>
                <td class="col-num col-score">{{ entry.totalScore }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="empty-msg">Noch keine Ergebnisse vorhanden.</p>
        </div>
      </div>

      <div class="section" v-if="topMovers.length">
        <h2>Top Mover (letzte 7 Tage)</h2>
        <div class="card">
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th>Spieler</th>
                <th class="col-num">Spiele</th>
                <th class="col-num">Siege</th>
                <th class="col-num">Punkte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in topMovers" :key="entry.userId" :class="{ 'is-me': entry.userId === myUserId }">
                <td class="col-rank">{{ i + 1 }}</td>
                <td class="col-name">{{ entry.username }}</td>
                <td class="col-num">{{ entry.gamesPlayed }}</td>
                <td class="col-num">{{ entry.wins }}</td>
                <td class="col-num" :class="entry.scoreChange >= 0 ? 'score-positive' : 'score-negative'">
                  {{ entry.scoreChange >= 0 ? '+' : '' }}{{ entry.scoreChange }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const myUserId = auth.user?.id;

const loading = ref(true);

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  pluginSlug: string;
  pluginName: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  gamesPlayed: number;
}

interface TopMover {
  userId: string;
  username: string;
  scoreChange: number;
  gamesPlayed: number;
  wins: number;
}

interface Records {
  mostWins: { username: string; value: number } | null;
  mostGames: { username: string; value: number } | null;
  bestWinrate: { username: string; value: number } | null;
  highestScore: { username: string; value: number } | null;
}

interface PluginInfo {
  slug: string;
  name: string;
}

const leaderboard = ref<LeaderboardEntry[]>([]);
const topMovers = ref<TopMover[]>([]);
const records = ref<Records | null>(null);
const plugins = ref<PluginInfo[]>([]);
const selectedPlugin = ref('');
const selectedPeriod = ref('');

async function loadLeaderboard() {
  const params = new URLSearchParams();
  if (selectedPlugin.value) params.set('pluginSlug', selectedPlugin.value);
  if (selectedPeriod.value) params.set('period', selectedPeriod.value);
  params.set('limit', '25');

  const result = await api.get<LeaderboardEntry[]>(`/stats/leaderboard?${params}`);
  if (result.data) leaderboard.value = result.data;
}

async function loadAll() {
  loading.value = true;
  try {
    const [lbResult, moversResult, recordsResult, pluginsResult] = await Promise.all([
      api.get<LeaderboardEntry[]>('/stats/leaderboard?limit=25'),
      api.get<TopMover[]>('/stats/top-movers'),
      api.get<Records>('/stats/records'),
      api.get<PluginInfo[]>('/plugins/active'),
    ]);

    if (lbResult.data) leaderboard.value = lbResult.data;
    if (moversResult.data) topMovers.value = moversResult.data;
    if (recordsResult.data) records.value = recordsResult.data;
    if (pluginsResult.data) plugins.value = pluginsResult.data;
  } catch (err) {
    console.error('Fehler beim Laden der Highscores:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadAll);
</script>

<style scoped>
h1 {
  margin-bottom: 1.5rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.record-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.record-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.record-label {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.record-value {
  font-weight: 700;
  color: var(--color-text);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-detail {
  font-size: 0.8rem;
  color: var(--color-primary);
  font-weight: 500;
}

.section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.section-header h2 {
  margin: 0;
}

h2 {
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}

.filter-row {
  display: flex;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.4rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
}

.leaderboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.leaderboard-table th,
.leaderboard-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.leaderboard-table th {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
}

.leaderboard-table tbody tr:last-child td {
  border-bottom: none;
}

.col-rank {
  width: 40px;
  text-align: center !important;
  color: var(--color-text-muted);
  font-weight: 600;
}

.col-name {
  font-weight: 600;
  color: var(--color-text);
}

.col-game {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.col-num {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
}

.col-score {
  font-weight: 700;
  color: var(--color-primary);
}

.is-me {
  background-color: rgba(99, 102, 241, 0.08);
}

.is-me .col-name {
  color: var(--color-primary);
}

.score-positive {
  color: var(--color-success) !important;
  font-weight: 600;
}

.score-negative {
  color: var(--color-danger) !important;
  font-weight: 600;
}

.empty-msg {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-muted);
}

@media (max-width: 600px) {
  .records-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filter-row {
    flex-direction: column;
  }
}
</style>
