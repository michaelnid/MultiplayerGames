<template>
  <div>
    <h2>System-Übersicht</h2>
    <div class="overview-grid">
      <div class="card stat-card">
        <span class="stat-value">{{ stats.users }}</span>
        <span class="stat-label">Benutzer</span>
      </div>
      <div class="card stat-card">
        <span class="stat-value">{{ stats.plugins }}</span>
        <span class="stat-label">Plugins</span>
      </div>
      <div class="card stat-card">
        <span class="stat-value">{{ stats.activeLobbies }}</span>
        <span class="stat-label">Aktive Lobbys</span>
      </div>
      <div class="card stat-card">
        <span class="stat-value">{{ stats.totalGames }}</span>
        <span class="stat-label">Gespielte Spiele</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../api/client.js';

const stats = ref({ users: 0, plugins: 0, activeLobbies: 0, totalGames: 0 });

onMounted(async () => {
  try {
    const result = await api.get<typeof stats.value>('/stats/admin-overview');
    if (result.data) stats.value = result.data;
  } catch {
    // Fehler ignorieren bei initialer Ladung
  }
});
</script>

<style scoped>
h2 { margin-bottom: 1rem; }

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card { text-align: center; padding: 1.25rem; }
.stat-value { display: block; font-size: 2rem; font-weight: 700; color: var(--color-primary); }
.stat-label { font-size: 0.8rem; color: var(--color-text-muted); text-transform: uppercase; }
</style>
