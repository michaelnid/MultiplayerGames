<template>
  <div class="lobby" v-if="lobby">
    <div class="lobby-header">
      <div>
        <h1>{{ lobby.pluginName }}</h1>
        <div class="lobby-meta">
          <span class="lobby-code">Code: <strong>{{ lobby.code }}</strong></span>
          <span :class="'status-badge status-' + lobby.status">{{ statusLabel }}</span>
        </div>
      </div>
      <div class="lobby-actions">
        <button
          v-if="isCreator && lobby.status === 'wartend'"
          class="btn-primary"
          @click="startGame"
          :disabled="players.length < lobby.minPlayers"
        >
          Spiel starten ({{ players.length }}/{{ lobby.minPlayers }} min)
        </button>
        <button
          v-if="isCreator && lobby.status === 'beendet'"
          class="btn-primary"
          @click="restartGame"
        >
          Erneut spielen
        </button>
        <button class="btn-secondary" @click="leaveLobby">Verlassen</button>
      </div>
    </div>

    <div v-if="lobby.status === 'wartend'" class="card">
      <h2>Spieler ({{ players.length }}/{{ lobby.maxPlayers }})</h2>
      <ul class="player-list">
        <li v-for="player in players" :key="player.userId" class="player-item">
          <span class="player-name">{{ player.username }}</span>
          <span v-if="player.userId === lobby.createdBy" class="host-badge">Host</span>
        </li>
      </ul>
    </div>

    <div v-if="lobby.status === 'laeuft' || lobby.status === 'beendet'" class="game-container" :class="{ 'game-overlay': isFullscreen }">
      <button class="fullscreen-btn" @click="isFullscreen = !isFullscreen" :title="isFullscreen ? 'Vollbild verlassen' : 'Vollbild'">
        <svg v-if="!isFullscreen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <component v-if="pluginComponent" :is="pluginComponent" />
      <div v-else class="card loading-plugin">
        <p>Plugin wird geladen...</p>
      </div>
    </div>
  </div>

  <div v-else class="loading">
    <p>Lade Lobby...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, markRaw, defineComponent, type Component } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/auth.js';
import { useSocketStore } from '../stores/socket.js';
import { WS_EVENTS } from '@mike-games/shared';

const props = defineProps<{ lobbyId: string }>();
const router = useRouter();
const auth = useAuthStore();
const ws = useSocketStore();

interface LobbyData {
  id: string;
  pluginName: string;
  pluginSlug: string;
  code: string;
  status: string;
  createdBy: string;
  creatorName: string;
  maxPlayers: number;
  minPlayers: number;
  players: { userId: string; username: string }[];
}

const lobby = ref<LobbyData | null>(null);
const players = ref<{ userId: string; username: string }[]>([]);
const pluginComponent = ref<Component | null>(null);
const isFullscreen = ref(false);

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false;
  }
}

const isCreator = computed(() => lobby.value?.createdBy === auth.user?.id);

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    wartend: 'Wartet auf Spieler',
    laeuft: 'Spiel laeuft',
    beendet: 'Beendet',
    geschlossen: 'Geschlossen',
  };
  return map[lobby.value?.status ?? ''] ?? lobby.value?.status;
});

async function loadLobby() {
  const result = await api.get<LobbyData>(`/lobbies/${props.lobbyId}`);
  if (result.data) {
    lobby.value = result.data;
    players.value = result.data.players || [];
  }
}

async function loadPluginFrontend() {
  if (!lobby.value || pluginComponent.value) return;

  try {
    (window as unknown as Record<string, unknown>).socket = ws.socket;
    (window as unknown as Record<string, unknown>).currentUserId = auth.user?.id;
    (window as unknown as Record<string, unknown>).lobbyId = props.lobbyId;
    const pluginUrl = `/plugins/${lobby.value.pluginSlug}/frontend/index.js?t=${Date.now()}`;
    const mod = await import(/* @vite-ignore */ pluginUrl);
    if (mod.default) {
      pluginComponent.value = markRaw(defineComponent(mod.default));
    }
  } catch (err) {
    console.error('Plugin-Frontend konnte nicht geladen werden:', err);
  }
}

function setupSocketEvents() {
  ws.connect();

  ws.on('auth:ok', () => {
    ws.emit(WS_EVENTS.LOBBY_JOIN, { lobbyId: props.lobbyId });
  });

  // Falls der Socket bereits verbunden und authentifiziert ist (z.B. nach
  // Navigation von einer anderen Seite zur Lobby), feuert 'auth:ok' nicht
  // erneut. In diesem Fall direkt der Lobby beitreten.
  if (ws.connected) {
    ws.emit(WS_EVENTS.LOBBY_JOIN, { lobbyId: props.lobbyId });
  }

  ws.on(WS_EVENTS.LOBBY_PLAYER_JOINED, (data: unknown) => {
    const d = data as { userId: string; username: string };
    if (!players.value.find((p) => p.userId === d.userId)) {
      players.value.push(d);
    }
    if (d.userId === auth.user?.id) {
      loadPluginFrontend();
    }
  });

  ws.on(WS_EVENTS.LOBBY_PLAYER_LEFT, (data: unknown) => {
    const d = data as { userId: string };
    players.value = players.value.filter((p) => p.userId !== d.userId);
  });

  ws.on(WS_EVENTS.LOBBY_STATUS_CHANGED, (data: unknown) => {
    const d = data as { status: string };
    if (lobby.value) lobby.value.status = d.status;
  });

  ws.on(WS_EVENTS.GAME_RESTART, () => {
    if (lobby.value) {
      lobby.value.status = 'laeuft';
      pluginComponent.value = null;
      loadPluginFrontend();
    }
  });
}

async function startGame() {
  await api.post(`/lobbies/${props.lobbyId}/start`, {});
  await loadLobby();
}

async function restartGame() {
  await api.post(`/lobbies/${props.lobbyId}/restart`, {});
}

async function leaveLobby() {
  ws.emit(WS_EVENTS.LOBBY_LEAVE);
  await api.post(`/lobbies/${props.lobbyId}/leave`, {});
  router.push('/multiplayer');
}

onMounted(async () => {
  await loadLobby();
  setupSocketEvents();
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  ws.off('auth:ok');
  ws.off(WS_EVENTS.LOBBY_PLAYER_JOINED);
  ws.off(WS_EVENTS.LOBBY_PLAYER_LEFT);
  ws.off(WS_EVENTS.LOBBY_STATUS_CHANGED);
  ws.off(WS_EVENTS.GAME_RESTART);
  document.removeEventListener('keydown', onKeydown);
  delete (window as unknown as Record<string, unknown>).socket;
  delete (window as unknown as Record<string, unknown>).currentUserId;
  delete (window as unknown as Record<string, unknown>).lobbyId;
});
</script>

<style scoped>
.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.lobby-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-top: 0.5rem;
}

.lobby-code {
  font-size: 1.1rem;
  font-family: monospace;
  background-color: var(--color-bg-card);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-wartend { background-color: var(--color-warning); color: #000; }
.status-laeuft { background-color: var(--color-success); color: #000; }
.status-beendet { background-color: var(--color-text-muted); color: #000; }

.lobby-actions { display: flex; gap: 0.5rem; }

h2 { font-size: 1rem; margin-bottom: 0.75rem; }

.player-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius);
}

.host-badge {
  font-size: 0.7rem;
  background-color: var(--color-primary);
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.game-container {
  min-height: 400px;
  position: relative;
}

.game-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: var(--color-bg);
  overflow: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.fullscreen-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 100;
  background: none;
  border: none;
  color: var(--color-text-muted);
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
  transition: opacity var(--transition);
}

.fullscreen-btn:hover {
  opacity: 1;
}

.game-overlay .fullscreen-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  opacity: 0.7;
  color: white;
}

.game-overlay .fullscreen-btn:hover {
  opacity: 1;
}

.loading-plugin {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

.loading { text-align: center; padding: 3rem; color: var(--color-text-muted); }
</style>
