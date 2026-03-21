<template>
  <div>
    <div class="section-header">
      <h2>Aktive Lobbys</h2>
      <button class="btn-secondary" @click="loadLobbies" :disabled="loading">
        {{ loading ? 'Lade...' : 'Aktualisieren' }}
      </button>
    </div>

    <p v-if="message" :class="hasError ? 'error-msg' : 'success-msg'">{{ message }}</p>

    <div v-if="lobbies.length === 0" class="card empty-state">
      <p>Keine aktiven Lobbys vorhanden.</p>
    </div>

    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Spiel</th>
          <th>Code</th>
          <th>Status</th>
          <th>Spieler</th>
          <th>Host</th>
          <th>Erstellt</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="lobby in lobbies" :key="lobby.id">
          <td>{{ lobby.pluginName }}</td>
          <td class="code-cell">{{ lobby.code }}</td>
          <td>
            <span class="status-badge" :class="'status-' + lobby.status">
              {{ statusLabel(lobby.status) }}
            </span>
          </td>
          <td>{{ lobby.playerCount }}/{{ lobby.maxPlayers }}</td>
          <td>{{ lobby.creatorName }}</td>
          <td>{{ formatDate(lobby.createdAt) }}</td>
          <td class="actions-cell">
            <button class="btn-secondary btn-sm" @click="openLobby(lobby.id)">Oeffnen</button>
            <button
              class="btn-danger btn-sm"
              @click="closeLobby(lobby.id, lobby.pluginName, lobby.code)"
              :disabled="closingLobbyId === lobby.id"
            >
              {{ closingLobbyId === lobby.id ? 'Schliesse...' : 'Schliessen' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api/client.js';

interface ActiveLobby {
  id: string;
  pluginName: string;
  code: string;
  status: 'wartend' | 'laeuft' | 'beendet' | 'geschlossen';
  playerCount: number;
  maxPlayers: number;
  creatorName: string;
  createdAt: string;
}

const router = useRouter();
const lobbies = ref<ActiveLobby[]>([]);
const loading = ref(false);
const closingLobbyId = ref<string | null>(null);
const message = ref('');
const hasError = ref(false);

function statusLabel(status: ActiveLobby['status']) {
  const labels: Record<ActiveLobby['status'], string> = {
    wartend: 'Wartend',
    laeuft: 'Laeuft',
    beendet: 'Beendet',
    geschlossen: 'Geschlossen',
  };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('de-DE');
}

function openLobby(lobbyId: string) {
  router.push(`/multiplayer/${lobbyId}`);
}

async function loadLobbies() {
  loading.value = true;
  try {
    const result = await api.get<ActiveLobby[]>('/lobbies');
    lobbies.value = result.data ?? [];
    if (hasError.value) {
      hasError.value = false;
      message.value = '';
    } else if (!closingLobbyId.value) {
      message.value = '';
    }
  } catch (e) {
    hasError.value = true;
    message.value = e instanceof Error ? e.message : 'Aktive Lobbys konnten nicht geladen werden';
  } finally {
    loading.value = false;
  }
}

async function closeLobby(lobbyId: string, pluginName: string, code: string) {
  if (!confirm(`Lobby "${pluginName}" (Code ${code}) wirklich schliessen?`)) return;

  closingLobbyId.value = lobbyId;
  message.value = '';
  hasError.value = false;

  try {
    await api.post(`/lobbies/${lobbyId}/close`, {});
    message.value = `Lobby ${code} wurde geschlossen.`;
    await loadLobbies();
  } catch (e) {
    hasError.value = true;
    message.value = e instanceof Error ? e.message : 'Lobby konnte nicht geschlossen werden';
  } finally {
    closingLobbyId.value = null;
  }
}

onMounted(loadLobbies);
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

h2 { font-size: 1.1rem; }

.empty-state { text-align: center; padding: 2rem; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.data-table th {
  background-color: var(--color-bg-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.data-table td { font-size: 0.875rem; }

.code-cell {
  font-family: monospace;
  font-weight: 700;
}

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-wartend { background-color: rgba(245, 158, 11, 0.2); color: #f59e0b; }
.status-laeuft { background-color: rgba(34, 197, 94, 0.2); color: #22c55e; }
.status-beendet { background-color: rgba(139, 143, 163, 0.2); color: var(--color-text-muted); }
.status-geschlossen { background-color: rgba(239, 68, 68, 0.2); color: #ef4444; }

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.error-msg { color: var(--color-danger); font-size: 0.85rem; margin-bottom: 1rem; }
.success-msg { color: var(--color-success); font-size: 0.85rem; margin-bottom: 1rem; }
</style>
