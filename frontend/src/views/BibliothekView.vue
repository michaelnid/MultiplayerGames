<template>
  <div class="bibliothek">
    <h1>Bibliothek</h1>
    <p class="text-muted">Alle verfuegbaren Spiele</p>

    <div v-if="plugins.length === 0" class="card empty-state">
      <p>Noch keine Spiele installiert.</p>
      <p class="text-muted">Spiele koennen im Admin-Bereich als Plugins installiert werden.</p>
    </div>

    <div v-else class="game-grid">
      <div v-for="plugin in plugins" :key="plugin.id" class="card game-card">
        <div class="game-icon">{{ plugin.name.charAt(0) }}</div>
        <h3>{{ plugin.name }}</h3>
        <p class="text-muted">{{ plugin.manifest?.description || 'Keine Beschreibung' }}</p>
        <div class="game-meta">
          <span>{{ plugin.manifest?.minPlayers }}–{{ plugin.manifest?.maxPlayers }} Spieler</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api/client.js';
import type { Plugin } from '@mike-games/shared';

const plugins = ref<Plugin[]>([]);

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins/active');
    plugins.value = result.data ?? [];
  } catch {
    // Keine Plugins vorhanden
  }
});
</script>

<style scoped>
.bibliothek h1 {
  margin-bottom: 0.25rem;
}

.text-muted {
  color: var(--color-text-muted);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  margin-top: 1.5rem;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.game-card {
  text-align: center;
  padding: 1.5rem;
  cursor: pointer;
  transition: border-color var(--transition), transform var(--transition);
}

.game-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.game-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background-color: var(--color-primary);
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.game-card h3 {
  margin-bottom: 0.5rem;
}

.game-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
