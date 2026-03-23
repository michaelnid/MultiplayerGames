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
      <component v-if="pluginComponent" :is="pluginComponent" />
      <div v-else class="card loading-plugin">
        <p>Plugin wird geladen...</p>
      </div>

      <!-- End-Screen Overlay -->
      <div v-if="endScreen" class="end-screen-overlay">
        <div class="end-screen-card">
          <h2 class="end-screen-title">{{ endScreen.title || 'Spiel beendet' }}</h2>

          <div v-if="endScreen.players && endScreen.players.length" class="end-screen-rankings">
            <div
              v-for="(player, index) in endScreen.players"
              :key="index"
              class="end-screen-player"
              :class="{ 'end-screen-winner': player.winner }"
            >
              <span class="end-screen-rank">{{ player.label || `#${index + 1}` }}</span>
              <span class="end-screen-name">{{ player.name }}</span>
              <span v-if="player.score != null" class="end-screen-score">{{ player.score }}</span>
              <span v-if="player.winner" class="end-screen-winner-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </span>
            </div>
          </div>

          <p v-if="endScreen.message" class="end-screen-message">{{ endScreen.message }}</p>

          <div class="end-screen-actions">
            <button v-if="isCreator" class="btn-primary" @click="restartGame">Erneut spielen</button>
            <button class="btn-secondary" @click="leaveLobby">Verlassen</button>
          </div>
        </div>
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
import { useSoundStore } from '../stores/sound.js';
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

interface EndScreenPlayer {
  name: string;
  score?: number;
  winner?: boolean;
  label?: string;
}

interface EndScreenData {
  title?: string;
  players: EndScreenPlayer[];
  message?: string;
}

const lobby = ref<LobbyData | null>(null);
const players = ref<{ userId: string; username: string }[]>([]);
const pluginComponent = ref<Component | null>(null);
const isFullscreen = ref(false);
const endScreen = ref<EndScreenData | null>(null);

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
    const win = window as unknown as Record<string, unknown>;
    win.socket = ws.socket;
    win.currentUserId = auth.user?.id;
    win.lobbyId = props.lobbyId;
    win.enterFullscreen = () => { isFullscreen.value = true; };
    win.exitFullscreen = () => { isFullscreen.value = false; };
    win.toggleFullscreen = () => { isFullscreen.value = !isFullscreen.value; };
    win.isFullscreen = () => isFullscreen.value;

    // Core-bereitgestellte SVG-Icons fuer Plugins
    win.icons = {
      fullscreenEnter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      fullscreenExit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    };

    // End-Screen API
    win.showEndScreen = (data: EndScreenData) => { endScreen.value = data; };
    win.hideEndScreen = () => { endScreen.value = null; };

    const soundStore = useSoundStore();
    win.soundSystem = {
      play: (src: string) => soundStore.play(src),
      isMuted: () => soundStore.isMuted,
    };
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
      endScreen.value = null;
      loadPluginFrontend();
    }
  });

  ws.on('plugin:uninstalled', (data: unknown) => {
    const d = data as { slug: string };
    if (lobby.value && lobby.value.pluginSlug === d.slug) {
      router.push('/multiplayer');
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
  ws.off('plugin:uninstalled');
  document.removeEventListener('keydown', onKeydown);
  const win = window as unknown as Record<string, unknown>;
  delete win.socket;
  delete win.currentUserId;
  delete win.lobbyId;
  delete win.enterFullscreen;
  delete win.exitFullscreen;
  delete win.toggleFullscreen;
  delete win.isFullscreen;
  delete win.soundSystem;
  delete win.icons;
  delete win.showEndScreen;
  delete win.hideEndScreen;
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

.status-wartend { background-color: var(--color-secondary); color: white; border: 2px solid var(--color-border); }
.status-laeuft { background-color: var(--color-success); color: white; border: 2px solid var(--color-border); }
.status-beendet { background-color: var(--color-bg-secondary); color: var(--color-text); border: 2px solid var(--color-border); }

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
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
}

.host-badge {
  font-size: 0.7rem;
  background-color: var(--color-secondary);
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius);
  font-weight: 700;
  border: 2px solid var(--color-border);
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


.loading-plugin {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

.loading { text-align: center; padding: 3rem; color: var(--color-text-muted); }

/* --- End-Screen Overlay --- */

.end-screen-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(10, 10, 26, 0.92);
  animation: endScreenFadeIn 0.4s ease;
}

@keyframes endScreenFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.end-screen-card {
  background-color: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  padding: 2rem;
  min-width: 320px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.end-screen-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color: var(--color-text);
}

.end-screen-rankings {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.end-screen-player {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background-color: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  transition: all var(--transition);
}

.end-screen-winner {
  background-color: rgba(0, 210, 106, 0.1);
  border-color: var(--color-primary);
}

.end-screen-rank {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  min-width: 36px;
  text-align: center;
}

.end-screen-winner .end-screen-rank {
  color: var(--color-primary);
}

.end-screen-name {
  flex: 1;
  font-weight: 600;
  text-align: left;
}

.end-screen-score {
  font-weight: 700;
  font-family: monospace;
  color: var(--color-text-muted);
}

.end-screen-winner .end-screen-score {
  color: var(--color-primary);
}

.end-screen-winner-badge {
  color: var(--color-primary);
  display: flex;
  align-items: center;
}

.end-screen-message {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.end-screen-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
</style>
