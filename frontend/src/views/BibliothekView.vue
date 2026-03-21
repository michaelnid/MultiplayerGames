<template>
  <div class="bibliothek">
    <section class="bib-header">
      <h1>Spielebibliothek</h1>
      <p class="bib-sub">Alle verfuegbaren Spiele als Kacheln</p>
    </section>

    <div v-if="loading" class="loading-state">Spiele werden geladen...</div>

    <div v-else-if="plugins.length === 0" class="empty-state card">
      <p>Noch keine Spiele installiert.</p>
      <p class="text-muted">Spiele werden als Plugins im Admin-Bereich hinzugefuegt.</p>
    </div>

    <div v-else class="game-grid">
      <button
        v-for="(plugin, i) in plugins"
        :key="plugin.id"
        type="button"
        class="game-card"
        :style="{ '--accent': colors[i % colors.length] }"
        @click="openDetails(plugin, i)"
      >
        <div class="game-card-icon">
          <img
            v-if="plugin.manifest?.icon"
            :src="`/plugins/${plugin.slug}/${plugin.manifest.icon}`"
            :alt="plugin.name"
            class="game-card-img"
          />
          <span v-else class="game-card-letter">{{ plugin.name.charAt(0) }}</span>
        </div>

        <div class="game-card-body">
          <h3 class="game-card-title">{{ plugin.name }}</h3>
          <p class="game-card-sub">{{ shortDescription(plugin) }}</p>
        </div>

        <div class="game-card-footer">
          <span class="players-pill">{{ playerRange(plugin) }} Spieler</span>
          <span class="version-pill">v{{ plugin.version }}</span>
        </div>
      </button>
    </div>

    <div v-if="selectedPlugin" class="detail-overlay" @click.self="closeDetails">
      <div class="detail-card card">
        <div class="detail-cover-area">
          <img
            v-if="selectedPlugin.manifest?.frontend?.bibliothek?.coverImage"
            :src="`/plugins/${selectedPlugin.slug}/${selectedPlugin.manifest.frontend.bibliothek.coverImage}`"
            :alt="selectedPlugin.name"
            class="detail-cover-img"
          />
          <div v-else class="detail-cover-fallback" :style="{ '--accent': selectedAccent }">
            <img
              v-if="selectedPlugin.manifest?.icon"
              :src="`/plugins/${selectedPlugin.slug}/${selectedPlugin.manifest.icon}`"
              :alt="selectedPlugin.name"
              class="detail-cover-fallback-icon"
            />
            <span v-else class="detail-cover-fallback-letter">{{ selectedPlugin.name.charAt(0) }}</span>
          </div>
        </div>

        <div class="detail-content">
          <h2 class="detail-title">{{ selectedPlugin.name }}</h2>

          <ul class="detail-meta">
            <li><strong>Spieler:</strong> {{ playerRange(selectedPlugin) }}</li>
            <li><strong>Version:</strong> v{{ selectedPlugin.version }}</li>
            <li v-if="selectedPlugin.manifest?.author"><strong>Autor:</strong> {{ selectedPlugin.manifest.author }}</li>
          </ul>

          <h3 class="detail-section-title">Spielerklaerung</h3>
          <p class="detail-text">{{ fullDescription(selectedPlugin) }}</p>

          <div class="detail-actions">
            <RouterLink
              v-if="auth.isLoggedIn"
              to="/multiplayer"
              class="play-btn"
              :style="{ backgroundColor: selectedAccent }"
              @click="closeDetails"
            >
              Lobby erstellen
            </RouterLink>
            <RouterLink v-else to="/login" class="play-btn" @click="closeDetails">
              Anmelden und spielen
            </RouterLink>

            <button type="button" class="btn-secondary close-btn" @click="closeDetails">Schliessen</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import type { Plugin } from '@mike-games/shared';

const auth = useAuthStore();
const plugins = ref<Plugin[]>([]);
const loading = ref(true);
const selectedPlugin = ref<Plugin | null>(null);
const selectedPluginColorIndex = ref<number | null>(null);

const colors = [
  '#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

const selectedAccent = computed(() => {
  if (selectedPluginColorIndex.value === null) return '#6366f1';
  return colors[selectedPluginColorIndex.value % colors.length];
});

function shortDescription(plugin: Plugin) {
  return plugin.manifest?.frontend?.bibliothek?.title
    ?? plugin.manifest?.description
    ?? 'Keine Kurzbeschreibung vorhanden.';
}

function fullDescription(plugin: Plugin) {
  return plugin.manifest?.frontend?.bibliothek?.description
    ?? plugin.manifest?.description
    ?? 'Dieses Spiel hat noch keine detailierte Spielerklaerung hinterlegt.';
}

function effectiveMinPlayers(plugin: Plugin | null): number {
  if (!plugin) return 1;
  const configured = plugin.effectiveMinPlayers;
  if (Number.isFinite(configured) && Number(configured) >= 1) {
    return Math.floor(Number(configured));
  }
  const manifestMin = plugin.manifest?.minPlayers;
  if (Number.isFinite(manifestMin) && Number(manifestMin) >= 1) {
    return Math.floor(Number(manifestMin));
  }
  return 1;
}

function effectiveMaxPlayers(plugin: Plugin | null): number {
  if (!plugin) return 1;
  const min = effectiveMinPlayers(plugin);
  const configured = plugin.effectiveMaxPlayers;
  if (Number.isFinite(configured) && Number(configured) >= min) {
    return Math.floor(Number(configured));
  }
  const manifestMax = plugin.manifest?.maxPlayers;
  if (Number.isFinite(manifestMax) && Number(manifestMax) >= min) {
    return Math.floor(Number(manifestMax));
  }
  return min;
}

function playerRange(plugin: Plugin | null): string {
  const min = effectiveMinPlayers(plugin);
  const max = effectiveMaxPlayers(plugin);
  return `${min}–${max}`;
}

function openDetails(plugin: Plugin, colorIndex: number) {
  selectedPlugin.value = plugin;
  selectedPluginColorIndex.value = colorIndex;
}

function closeDetails() {
  selectedPlugin.value = null;
  selectedPluginColorIndex.value = null;
}

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins/active');
    plugins.value = result.data ?? [];
  } catch {
    // Keine Plugins
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.bibliothek {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.bib-header {
  text-align: center;
  padding: 3rem 0 2rem;
}

.bib-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.bib-sub {
  color: var(--color-text-muted);
  font-size: 1rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem;
  padding-bottom: 3rem;
}

.game-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  text-align: left;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
}

.game-card:hover {
  border-color: var(--accent, var(--color-primary));
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

.game-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent, var(--color-primary)), rgba(15, 17, 23, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-card-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.game-card-letter {
  color: #fff;
  font-size: 1.3rem;
  font-weight: 700;
}

.game-card-body {
  flex: 1;
}

.game-card-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.game-card-sub {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.players-pill {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  background-color: var(--color-bg-hover);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
}

.version-pill {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.detail-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 50;
  overflow-y: auto;
}

.detail-card {
  width: 100%;
  max-width: 460px;
  max-height: 80vh;
  overflow: auto;
  padding: 0;
  margin: auto;
}

.detail-cover-area {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  overflow: hidden;
  line-height: 0;
  background-color: var(--color-bg);
  flex-shrink: 0;
}

.detail-cover-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background-color: var(--color-bg);
}

.detail-cover-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--accent, var(--color-primary)), rgba(15, 17, 23, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-cover-fallback-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.detail-cover-fallback-letter {
  color: #fff;
  font-size: 2rem;
  font-weight: 700;
}

.detail-content {
  padding: 1.5rem;
}

.detail-title {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.detail-section-title {
  margin-top: 1rem;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
  color: var(--color-text-muted);
}

.detail-text {
  margin-bottom: 1rem;
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre-line;
}

.detail-meta {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.2rem;
}

.detail-meta strong {
  color: var(--color-text);
}

.detail-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 1rem;
}

.play-btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background-color: var(--color-primary);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity var(--transition), transform var(--transition);
}

.play-btn:hover {
  opacity: 0.9;
  transform: scale(1.03);
  color: white;
}

.close-btn {
  padding: 0.5rem 1rem;
}

@media (max-width: 1024px) {
  .game-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .detail-overlay {
    padding: 1rem;
  }

  .detail-card {
    max-width: 380px;
  }

  .detail-content {
    padding: 1.25rem;
  }

  .detail-text {
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .bibliothek {
    padding: 0 1rem;
  }

  .bib-header {
    padding: 2rem 0 1.5rem;
  }

  .bib-header h1 {
    font-size: 1.5rem;
  }

  .game-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .game-card {
    padding: 0.75rem;
    gap: 0.5rem;
  }

  .game-card-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
  }

  .game-card-img {
    width: 24px;
    height: 24px;
  }

  .game-card-letter {
    font-size: 1rem;
  }

  .game-card-title {
    font-size: 0.85rem;
  }

  .game-card-sub {
    font-size: 0.75rem;
    -webkit-line-clamp: 1;
  }

  .detail-overlay {
    padding: 0.5rem;
    align-items: flex-start;
    padding-top: 2rem;
  }

  .detail-card {
    max-width: 100%;
    max-height: none;
  }

  .detail-cover-area {
    aspect-ratio: 16 / 9;
  }

  .detail-content {
    padding: 1rem;
  }

  .detail-title {
    font-size: 1.1rem;
  }

  .detail-text {
    font-size: 0.85rem;
  }

  .detail-actions {
    flex-direction: column;
  }

  .play-btn,
  .close-btn {
    text-align: center;
    width: 100%;
  }
}
</style>
