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
      <RouterLink
        v-for="(plugin, i) in plugins"
        :key="plugin.id"
        :to="`/bibliothek/${plugin.slug}`"
        class="game-card"
        :style="{ '--accent': colors[i % colors.length] }"
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
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../api/client.js';
import type { Plugin } from '@mike-games/shared';

const plugins = ref<Plugin[]>([]);
const loading = ref(true);

const colors = [
  '#3B82F6', '#8B5CF6', '#22C55E', '#EF4444', '#06B6D4', '#F59E0B',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

function shortDescription(plugin: Plugin) {
  return plugin.manifest?.frontend?.bibliothek?.title
    ?? plugin.manifest?.description
    ?? 'Keine Kurzbeschreibung vorhanden.';
}

function effectiveMinPlayers(plugin: Plugin): number {
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

function effectiveMaxPlayers(plugin: Plugin): number {
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

function playerRange(plugin: Plugin): string {
  const min = effectiveMinPlayers(plugin);
  const max = effectiveMaxPlayers(plugin);
  return `${min}–${max}`;
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
  font-weight: 900;
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
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  text-align: left;
  color: var(--color-text);
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform var(--transition), box-shadow var(--transition);
  box-shadow: var(--shadow);
}

.game-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}

.game-card-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-border);
  background-color: var(--accent, var(--color-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.game-card-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.game-card-letter {
  color: var(--color-text);
  font-size: 1.3rem;
  font-weight: 800;
}

.game-card-body {
  flex: 1;
}

.game-card-title {
  font-size: 1rem;
  font-weight: 700;
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
  font-weight: 700;
  color: var(--color-text);
  background-color: var(--color-bg-secondary);
  padding: 0.15rem 0.55rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
}

.version-pill {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

@media (max-width: 1024px) {
  .game-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
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
}
</style>
