<template>
  <div class="spiel-detail">
    <div v-if="loading" class="loading-state">Spiel wird geladen...</div>

    <div v-else-if="!plugin" class="empty-state card">
      <p>Spiel nicht gefunden.</p>
      <RouterLink to="/bibliothek" class="back-link-inline">Zurück zur Bibliothek</RouterLink>
    </div>

    <div v-else class="detail-card card">
      <div class="detail-top">
        <div class="detail-cover-area">
          <img
            v-if="plugin.manifest?.frontend?.bibliothek?.coverImage"
            :src="`/plugins/${plugin.slug}/${plugin.manifest.frontend.bibliothek.coverImage}`"
            :alt="plugin.name"
            class="detail-cover-img"
          />
          <div v-else class="detail-cover-fallback">
            <img
              v-if="plugin.manifest?.icon"
              :src="`/plugins/${plugin.slug}/${plugin.manifest.icon}`"
              :alt="plugin.name"
              class="detail-cover-fallback-icon"
            />
            <span v-else class="detail-cover-fallback-letter">{{ plugin.name.charAt(0) }}</span>
          </div>
        </div>

        <div class="detail-info">
          <h1 class="detail-title">{{ plugin.name }}</h1>
          <ul class="detail-meta">
            <li><strong>Spieler:</strong> {{ playerRange(plugin) }}</li>
            <li><strong>Version:</strong> v{{ plugin.version }}</li>
            <li v-if="plugin.manifest?.author"><strong>Autor:</strong> {{ plugin.manifest.author }}</li>
          </ul>
          <div class="detail-actions">
            <RouterLink
              v-if="auth.isLoggedIn"
              to="/multiplayer"
              class="play-btn"
            >
              Lobby erstellen
            </RouterLink>
            <RouterLink v-else to="/login" class="play-btn">
              Anmelden und spielen
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="detail-content">
        <h2 class="detail-section-title">Spielerklärung</h2>
        <p class="detail-text">{{ fullDescription(plugin) }}</p>
      </div>

      <div class="detail-footer">
        <RouterLink to="/bibliothek" class="back-btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Zurück zur Bibliothek
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import type { Plugin } from '@mike-games/shared';

const props = defineProps<{ slug: string }>();
const auth = useAuthStore();
const plugin = ref<Plugin | null>(null);
const loading = ref(true);

function effectiveMinPlayers(p: Plugin): number {
  const configured = p.effectiveMinPlayers;
  if (Number.isFinite(configured) && Number(configured) >= 1) {
    return Math.floor(Number(configured));
  }
  const manifestMin = p.manifest?.minPlayers;
  if (Number.isFinite(manifestMin) && Number(manifestMin) >= 1) {
    return Math.floor(Number(manifestMin));
  }
  return 1;
}

function effectiveMaxPlayers(p: Plugin): number {
  const min = effectiveMinPlayers(p);
  const configured = p.effectiveMaxPlayers;
  if (Number.isFinite(configured) && Number(configured) >= min) {
    return Math.floor(Number(configured));
  }
  const manifestMax = p.manifest?.maxPlayers;
  if (Number.isFinite(manifestMax) && Number(manifestMax) >= min) {
    return Math.floor(Number(manifestMax));
  }
  return min;
}

function playerRange(p: Plugin): string {
  return `${effectiveMinPlayers(p)}–${effectiveMaxPlayers(p)}`;
}

function fullDescription(p: Plugin) {
  return p.manifest?.frontend?.bibliothek?.description
    ?? p.manifest?.description
    ?? 'Dieses Spiel hat noch keine detaillierte Spielerklärung hinterlegt.';
}

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins/active');
    const all = result.data ?? [];
    plugin.value = all.find(p => p.slug === props.slug) ?? null;
  } catch {
    // Fehler
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.spiel-detail {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
}

.back-link-inline {
  color: var(--color-primary);
  text-decoration: none;
}

.detail-card {
  padding: 0;
  overflow: hidden;
}

.detail-top {
  display: flex;
  gap: 0;
}

.detail-cover-area {
  width: 280px;
  min-height: 200px;
  flex-shrink: 0;
  overflow: hidden;
  line-height: 0;
  background-color: var(--color-bg);
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
  background: linear-gradient(135deg, var(--color-primary), rgba(15, 17, 23, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-cover-fallback-icon {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.detail-cover-fallback-letter {
  color: #fff;
  font-size: 3rem;
  font-weight: 700;
}

.detail-info {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.detail-title {
  font-size: 1.4rem;
  margin: 0 0 0.5rem;
}

.detail-meta {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1rem;
}

.detail-meta strong {
  color: var(--color-text);
}

.detail-actions {
  margin-top: auto;
}

.play-btn {
  display: inline-block;
  padding: 0.5rem 1.25rem;
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

.detail-content {
  padding: 0 1.5rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.detail-section-title {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  color: var(--color-text-muted);
}

.detail-text {
  margin: 0;
  color: var(--color-text);
  line-height: 1.7;
  white-space: pre-line;
}

.detail-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  text-decoration: none;
}

@media (max-width: 768px) {
  .spiel-detail {
    padding: 0 1rem 2rem;
  }

  .detail-top {
    flex-direction: column;
  }

  .detail-cover-area {
    width: 100%;
    min-height: 0;
    aspect-ratio: 16 / 9;
  }

  .detail-info {
    padding: 1rem;
  }

  .detail-title {
    font-size: 1.2rem;
  }

  .detail-content {
    padding: 0 1rem 1rem;
  }

  .detail-text {
    font-size: 0.9rem;
  }

  .detail-footer {
    padding: 1rem;
  }
}
</style>
