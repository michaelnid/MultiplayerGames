<template>
  <div>
    <h2>Spieleinstellungen</h2>
    <p class="text-muted">Hier koennen plugin-spezifische Einstellungen vorgenommen werden.</p>

    <div v-if="pluginsWithSettings.length === 0" class="card empty-state">
      <p>Keine Plugins mit Einstellungen installiert.</p>
    </div>

    <div v-else class="settings-list">
      <RouterLink
        v-for="plugin in pluginsWithSettings"
        :key="plugin.id"
        :to="`/admin/spieleinstellungen/${plugin.slug}`"
        class="card settings-card"
      >
        <div class="settings-icon">{{ plugin.name.charAt(0) }}</div>
        <div class="settings-info">
          <h3>{{ plugin.name }}</h3>
          <span class="text-muted">v{{ plugin.version }}</span>
        </div>
        <span class="arrow">&rarr;</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../../api/client.js';
import type { Plugin } from '@mike-games/shared';

const pluginsWithSettings = ref<Plugin[]>([]);

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins');
    pluginsWithSettings.value = (result.data ?? []).filter(
      (p) => p.enabled && p.manifest?.frontend?.adminSettings,
    );
  } catch {
    // Keine Plugins
  }
});
</script>

<style scoped>
h2 { font-size: 1.1rem; margin-bottom: 0.25rem; }
.text-muted { color: var(--color-text-muted); }

.empty-state { text-align: center; padding: 2rem; margin-top: 1rem; }

.settings-list { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }

.settings-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  text-decoration: none;
  color: var(--color-text);
  transition: border-color var(--transition);
}

.settings-card:hover { border-color: var(--color-primary); }

.settings-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius);
  background-color: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.settings-info { flex: 1; }
.settings-info h3 { margin-bottom: 0; font-size: 0.95rem; }
.arrow { color: var(--color-text-muted); font-size: 1.2rem; }
</style>
