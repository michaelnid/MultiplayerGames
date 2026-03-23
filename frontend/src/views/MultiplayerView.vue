<template>
  <div class="multiplayer">
    <h1>Multiplayer</h1>

    <div class="multiplayer-actions">
      <div class="card join-card">
        <h2>Lobby beitreten</h2>
        <form @submit.prevent="joinLobby" class="join-form">
          <div class="code-input-group">
            <input
              v-model="lobbyCode"
              type="text"
              placeholder="0000"
              maxlength="4"
              pattern="\d{4}"
              inputmode="numeric"
              class="code-input"
            />
            <button type="submit" class="btn-primary">Beitreten</button>
          </div>
          <p v-if="joinError" class="error-msg">{{ joinError }}</p>
        </form>
      </div>
    </div>

    <div class="card">
      <h2>Aktive Lobbys</h2>
      <div v-if="lobbies.length === 0" class="text-muted">Keine aktiven Lobbys.</div>
      <div v-else class="lobby-list">
        <div v-for="lobby in lobbies" :key="lobby.id" class="lobby-item" @click="goToLobby(lobby.id)">
          <div class="lobby-item-info">
            <strong>{{ lobby.pluginName }}</strong>
            <span class="lobby-item-meta">
              Code: <strong>{{ lobby.code }}</strong>
              -- {{ lobby.playerCount }}/{{ lobby.maxPlayers }} Spieler
              -- Host: {{ lobby.creatorName }}
            </span>
          </div>
          <span :class="'status-badge status-' + lobby.status">
            {{ lobby.status === 'wartend' ? 'Offen' : 'Laeuft' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';

const auth = useAuthStore();
const router = useRouter();

const lobbyCode = ref('');
const joinError = ref('');

interface LobbyInfo {
  id: string;
  pluginName: string;
  code: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  creatorName: string;
}

const lobbies = ref<LobbyInfo[]>([]);

async function loadData() {
  try {
    const lobbyResult = await api.get<LobbyInfo[]>('/lobbies');
    lobbies.value = lobbyResult.data ?? [];
  } catch { /* Fehler ignorieren */ }
}

async function joinLobby() {
  joinError.value = '';
  if (!/^\d{4}$/.test(lobbyCode.value)) {
    joinError.value = 'Bitte einen 4-stelligen Zahlencode eingeben';
    return;
  }
  try {
    const result = await api.post<{ lobbyId: string }>('/lobbies/join', { code: lobbyCode.value });
    if (result.data?.lobbyId) {
      router.push(`/multiplayer/${result.data.lobbyId}`);
    }
  } catch (e) {
    joinError.value = e instanceof Error ? e.message : 'Beitritt fehlgeschlagen';
  }
}


function goToLobby(id: string) {
  router.push(`/multiplayer/${id}`);
}

onMounted(loadData);
</script>

<style scoped>
.multiplayer h1 { margin-bottom: 1.5rem; }

.multiplayer-actions {
  margin-bottom: 1.5rem;
}

.text-muted { color: var(--color-text-muted); }
h2 { font-size: 1.1rem; margin-bottom: 0.75rem; }

.join-form { display: flex; flex-direction: column; gap: 0.5rem; }

.code-input-group { display: flex; gap: 0.5rem; }

.code-input {
  font-size: 1.5rem;
  text-align: center;
  letter-spacing: 8px;
  font-weight: 700;
  max-width: 180px;
}

.error-msg { color: var(--color-danger); font-size: 0.85rem; }

.form-group { margin-bottom: 0.75rem; }
.form-actions { display: flex; gap: 0.5rem; }

.lobby-list { display: flex; flex-direction: column; gap: 0.5rem; }

.lobby-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color var(--transition);
}

.lobby-item:hover { border-color: var(--color-primary); }

.lobby-item-meta { display: block; font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem; }

.status-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.status-wartend { background-color: var(--color-secondary); color: white; border: 2px solid var(--color-border); }
.status-laeuft { background-color: var(--color-success); color: white; border: 2px solid var(--color-border); }

@media (max-width: 768px) {
  .multiplayer-actions { grid-template-columns: 1fr; }
}
</style>
