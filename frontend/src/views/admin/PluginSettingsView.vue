<template>
  <div>
    <div class="settings-header">
      <RouterLink to="/admin/spieleinstellungen" class="back-link">&larr; Zurueck</RouterLink>
      <h2>{{ pluginName }} -- Einstellungen</h2>
    </div>

    <div class="card">
      <div v-if="loading" class="text-muted">Lade Einstellungen...</div>
      <div v-else-if="!hasSettings" class="text-muted">
        Dieses Plugin bietet keine Einstellungskomponente.
      </div>
      <div v-else id="plugin-settings-container">
        <!-- Plugin-Settings-Komponente wird hier dynamisch geladen -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../../api/client.js';
import type { Plugin } from '@mike-games/shared';

const props = defineProps<{ slug: string }>();

const pluginName = ref('');
const loading = ref(true);
const hasSettings = ref(false);

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins');
    const plugin = (result.data ?? []).find((p) => p.slug === props.slug);
    if (plugin) {
      pluginName.value = plugin.name;
      hasSettings.value = !!plugin.manifest?.frontend?.adminSettings;
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.settings-header { margin-bottom: 1rem; }

.back-link {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0.5rem;
}

.back-link:hover { color: var(--color-primary); }

h2 { font-size: 1.1rem; }
.text-muted { color: var(--color-text-muted); }
</style>
