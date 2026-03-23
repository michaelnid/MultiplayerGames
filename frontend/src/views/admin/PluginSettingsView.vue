<template>
  <div>
    <div class="settings-header">
      <RouterLink to="/admin/spieleinstellungen" class="back-link">&larr; Zurück</RouterLink>
      <h2>{{ pluginName }} -- Einstellungen</h2>
    </div>

    <div class="card">
      <div v-if="loading" class="text-muted">Lade Einstellungen...</div>
      <div v-else-if="loadError" class="text-muted">{{ loadError }}</div>
      <div v-else-if="!settingsComponent" class="text-muted">
        Dieses Plugin bietet keine Einstellungskomponente.
      </div>
      <component v-else :is="settingsComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, defineComponent, type Component } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../../api/client.js';
import type { Plugin } from '@mike-games/shared';

const props = defineProps<{ slug: string }>();

const pluginName = ref('');
const loading = ref(true);
const loadError = ref('');
const settingsComponent = ref<Component | null>(null);

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins');
    const plugin = (result.data ?? []).find((p) => p.slug === props.slug);
    if (!plugin) {
      loadError.value = 'Plugin nicht gefunden.';
      return;
    }

    pluginName.value = plugin.name;
    const settingsPath = plugin.manifest?.frontend?.adminSettings;
    if (!settingsPath) return;

    const url = `/plugins/${plugin.slug}/${settingsPath}?t=${Date.now()}`;
    const mod = await import(/* @vite-ignore */ url);
    if (mod.default) {
      settingsComponent.value = markRaw(defineComponent(mod.default));
    } else {
      loadError.value = 'Einstellungskomponente hat keinen default-Export.';
    }
  } catch (e) {
    loadError.value = 'Einstellungen konnten nicht geladen werden.';
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
