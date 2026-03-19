<template>
  <div class="profil">
    <h1>Mein Profil</h1>
    <p class="welcome-text">Willkommen, {{ auth.user?.username }}!</p>

    <div class="stats-grid">
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

    <div class="card recent-card">
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

    <div class="profil-grid">
      <div class="card">
        <h2>Kontoinformationen</h2>
        <div class="info-row">
          <span class="info-label">Benutzername</span>
          <span>{{ auth.user?.username }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rolle</span>
          <span class="role-badge">{{ roleName }}</span>
        </div>
      </div>

      <div class="card">
        <h2>Passwort aendern</h2>
        <form @submit.prevent="handleChangePassword" class="password-form">
          <div class="form-group">
            <label for="currentPassword">Aktuelles Passwort</label>
            <input id="currentPassword" v-model="currentPassword" type="password" required />
          </div>
          <div class="form-group">
            <label for="newPassword">Neues Passwort</label>
            <input id="newPassword" v-model="newPassword" type="password" minlength="8" required />
          </div>
          <p v-if="pwError" class="error-msg">{{ pwError }}</p>
          <p v-if="pwSuccess" class="success-msg">Passwort erfolgreich geaendert.</p>
          <button type="submit" class="btn-primary">Passwort aendern</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';

const auth = useAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const pwError = ref('');
const pwSuccess = ref(false);

const myStats = ref({ totalWins: 0, totalGames: 0, totalScore: 0 });
const activeLobbies = ref(0);
const recentGames = ref<{ id: string; pluginName: string; startedAt: string; endedAt: string | null }[]>([]);

const roleName = computed(() => {
  const map: Record<string, string> = {
    admin: 'Administrator',
    gamemaster: 'Game Master',
    spieler: 'Spieler',
  };
  return map[auth.user?.role ?? ''] ?? auth.user?.role;
});

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

async function handleChangePassword() {
  pwError.value = '';
  pwSuccess.value = false;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    pwSuccess.value = true;
    currentPassword.value = '';
    newPassword.value = '';
  } catch (e) {
    pwError.value = e instanceof Error ? e.message : 'Fehler beim Aendern';
  }
}
</script>

<style scoped>
.profil h1 { margin-bottom: 0.25rem; }

.welcome-text {
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card { text-align: center; padding: 1.25rem; }
.stat-value { display: block; font-size: 2rem; font-weight: 700; color: var(--color-primary); }
.stat-label { font-size: 0.75rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

.recent-card { margin-bottom: 1.5rem; }

.profil-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

h2 { font-size: 1.1rem; margin-bottom: 1rem; }

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.info-label { color: var(--color-text-muted); }

.role-badge {
  background-color: var(--color-primary);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.25rem; }

.error-msg { color: var(--color-danger); font-size: 0.85rem; }
.success-msg { color: var(--color-success); font-size: 0.85rem; }
.text-muted { color: var(--color-text-muted); }

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

@media (max-width: 768px) {
  .profil-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
