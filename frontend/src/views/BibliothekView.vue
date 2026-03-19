<template>
  <div class="bibliothek">
    <section class="bib-header">
      <h1>Spielebibliothek</h1>
      <p class="bib-sub">Alle verfuegbaren Spiele auf einen Blick</p>
    </section>

    <div v-if="loading" class="loading-state">Spiele werden geladen...</div>

    <div v-else-if="plugins.length === 0" class="empty-state card">
      <p>Noch keine Spiele installiert.</p>
      <p class="text-muted">Spiele werden als Plugins im Admin-Bereich hinzugefuegt.</p>
    </div>

    <div v-else class="game-list">
      <div
        v-for="(plugin, i) in plugins"
        :key="plugin.id"
        class="game-item"
        :style="{ '--accent': colors[i % colors.length] }"
      >
        <div class="game-item-icon">
          <img
            v-if="plugin.manifest?.icon"
            :src="`/plugins/${plugin.slug}/${plugin.manifest.icon}`"
            :alt="plugin.name"
            class="game-item-img"
          />
          <span v-else class="game-item-letter">{{ plugin.name.charAt(0) }}</span>
        </div>

        <div class="game-item-info">
          <h3>{{ plugin.name }}</h3>
          <p class="game-item-desc">{{ plugin.manifest?.description || 'Keine Beschreibung' }}</p>
        </div>

        <div class="game-item-meta">
          <span class="meta-badge">{{ plugin.manifest?.minPlayers }}–{{ plugin.manifest?.maxPlayers }} Spieler</span>
          <span class="meta-version">v{{ plugin.version }}</span>
        </div>

        <div class="game-item-action">
          <RouterLink
            v-if="auth.isLoggedIn"
            to="/multiplayer"
            class="play-btn"
            :style="{ backgroundColor: colors[i % colors.length] }"
          >
            Spielen
          </RouterLink>
          <RouterLink v-else to="/login" class="play-btn">
            Anmelden
          </RouterLink>
        </div>
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

const auth = useAuthStore();
const plugins = ref<Plugin[]>([]);
const loading = ref(true);

const colors = [
  '#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

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
  max-width: 900px;
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

.game-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 3rem;
}

.game-item {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition), transform var(--transition);
}

.game-item:hover {
  border-color: var(--accent, var(--color-primary));
  transform: translateX(4px);
}

.game-item-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent, var(--color-primary)), rgba(255,255,255,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.game-item-img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}

.game-item-letter {
  color: white;
  font-size: 1.2rem;
  font-weight: 700;
}

.game-item-info {
  flex: 1;
  min-width: 0;
}

.game-item-info h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.game-item-desc {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.game-item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  flex-shrink: 0;
}

.meta-badge {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background-color: var(--color-bg-hover);
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
}

.meta-version {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.game-item-action {
  flex-shrink: 0;
}

.play-btn {
  display: inline-block;
  padding: 0.45rem 1rem;
  border-radius: 20px;
  background-color: var(--color-primary);
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity var(--transition), transform var(--transition);
}

.play-btn:hover {
  opacity: 0.85;
  transform: scale(1.05);
  color: white;
}

@media (max-width: 768px) {
  .game-item {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .game-item-meta {
    flex-direction: row;
    align-items: center;
  }

  .game-item-action {
    width: 100%;
  }

  .play-btn {
    display: block;
    text-align: center;
  }
}
</style>
