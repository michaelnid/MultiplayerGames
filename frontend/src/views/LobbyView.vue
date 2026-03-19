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
        <button class="btn-secondary" @click="leaveLobby">Verlassen</button>
      </div>
    </div>

    <div class="lobby-grid">
      <div class="lobby-main">
        <div class="card">
          <h2>Spieler ({{ players.length }}/{{ lobby.maxPlayers }})</h2>
          <ul class="player-list">
            <li v-for="player in players" :key="player.userId" class="player-item">
              <span class="player-name">{{ player.username }}</span>
              <span v-if="player.userId === lobby.createdBy" class="host-badge">Host</span>
            </li>
          </ul>
        </div>

        <div v-if="lobby.status === 'laeuft'" class="card game-area">
          <h2>Spiel laeuft</h2>
          <div id="plugin-game-container">
            <!-- Plugin-Spielansicht wird hier geladen -->
          </div>
        </div>
      </div>

      <div class="lobby-chat">
        <div class="card chat-card">
          <h2>Chat</h2>
          <div class="chat-messages" ref="chatContainer">
            <div
              v-for="(msg, i) in chatMessages"
              :key="i"
              :class="['chat-msg', { 'chat-system': msg.system }]"
            >
              <span v-if="!msg.system" class="chat-author">{{ msg.username }}:</span>
              <span class="chat-text">{{ msg.message }}</span>
              <span class="chat-time">{{ formatTime(msg.timestamp) }}</span>
            </div>
          </div>
          <form @submit.prevent="sendMessage" class="chat-input-group">
            <input
              v-model="chatInput"
              type="text"
              placeholder="Nachricht..."
              maxlength="500"
              class="chat-input"
            />
            <button type="submit" class="btn-primary">Senden</button>
          </form>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="loading">
    <p>Lade Lobby...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
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

interface ChatMsg {
  username: string;
  message: string;
  system: boolean;
  timestamp: string;
}

const lobby = ref<LobbyData | null>(null);
const players = ref<{ userId: string; username: string }[]>([]);
const chatMessages = ref<ChatMsg[]>([]);
const chatInput = ref('');
const chatContainer = ref<HTMLElement>();

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

function setupSocketEvents() {
  ws.connect();
  ws.emit(WS_EVENTS.LOBBY_JOIN, { lobbyId: props.lobbyId });

  ws.on(WS_EVENTS.LOBBY_PLAYER_JOINED, (data: unknown) => {
    const d = data as { userId: string; username: string };
    if (!players.value.find((p) => p.userId === d.userId)) {
      players.value.push(d);
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

  ws.on(WS_EVENTS.CHAT_MESSAGE, (data: unknown) => {
    chatMessages.value.push(data as ChatMsg);
    scrollChat();
  });

  ws.on('chat:system', (data: unknown) => {
    chatMessages.value.push(data as ChatMsg);
    scrollChat();
  });
}

async function sendMessage() {
  if (!chatInput.value.trim()) return;
  ws.emit(WS_EVENTS.CHAT_MESSAGE, { message: chatInput.value });
  chatInput.value = '';
}

async function startGame() {
  await api.post(`/lobbies/${props.lobbyId}/start`, {});
  await loadLobby();
}

async function leaveLobby() {
  ws.emit(WS_EVENTS.LOBBY_LEAVE);
  await api.post(`/lobbies/${props.lobbyId}/leave`, {});
  router.push('/multiplayer');
}

function scrollChat() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
  loadLobby();
  setupSocketEvents();
});

onUnmounted(() => {
  ws.emit(WS_EVENTS.LOBBY_LEAVE);
  ws.off(WS_EVENTS.LOBBY_PLAYER_JOINED);
  ws.off(WS_EVENTS.LOBBY_PLAYER_LEFT);
  ws.off(WS_EVENTS.LOBBY_STATUS_CHANGED);
  ws.off(WS_EVENTS.CHAT_MESSAGE);
  ws.off('chat:system');
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

.lobby-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 1rem;
  height: calc(100vh - 200px);
}

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

.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  max-height: calc(100vh - 360px);
}

.chat-msg {
  font-size: 0.85rem;
  padding: 0.25rem 0;
  line-height: 1.4;
}

.chat-system {
  color: var(--color-text-muted);
  font-style: italic;
}

.chat-author {
  font-weight: 600;
  color: var(--color-primary);
  margin-right: 0.25rem;
}

.chat-time {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-left: 0.5rem;
}

.chat-input-group {
  display: flex;
  gap: 0.5rem;
}

.chat-input { flex: 1; }

.loading { text-align: center; padding: 3rem; color: var(--color-text-muted); }

.game-area { margin-top: 1rem; }

@media (max-width: 900px) {
  .lobby-grid { grid-template-columns: 1fr; height: auto; }
}
</style>
