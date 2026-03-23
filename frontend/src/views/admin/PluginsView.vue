<template>
  <div>
    <div class="section-header">
      <h2>Plugin-Verwaltung</h2>
      <div class="upload-area">
        <input type="file" accept=".zip" ref="fileInput" @change="handleUpload" class="file-input" />
        <button class="btn-primary" @click="($refs.fileInput as HTMLInputElement)?.click()">
          Plugin installieren (ZIP)
        </button>
      </div>
    </div>

    <p v-if="uploadMsg" :class="uploadError ? 'error-msg' : 'success-msg'">{{ uploadMsg }}</p>

    <div v-if="plugins.length === 0" class="card empty-state">
      <p>Keine Plugins installiert.</p>
    </div>

    <div v-else class="plugin-list">
      <div v-for="plugin in plugins" :key="plugin.id" class="card plugin-card">
        <div class="plugin-info">
          <h3>{{ plugin.name }}</h3>
          <span class="plugin-meta">v{{ plugin.version }} -- {{ plugin.author || 'Unbekannt' }}</span>
          <span class="plugin-slug">{{ plugin.slug }}</span>
        </div>
        <div class="plugin-actions">
          <button
            :class="plugin.enabled ? 'btn-secondary' : 'btn-primary'"
            @click="togglePlugin(plugin.id, plugin.enabled)"
          >
            {{ plugin.enabled ? 'Deaktivieren' : 'Aktivieren' }}
          </button>
          <button class="btn-danger" @click="openUninstallModal(plugin.id, plugin.name)">Deinstallieren</button>
        </div>
      </div>
    </div>

    <AppModal
      v-model="showUninstallModal"
      title="Plugin deinstallieren"
      :message="uninstallModalMessage"
      confirm-text="Deinstallieren"
      cancel-text="Abbrechen"
      busy-text="Deinstalliere..."
      confirm-variant="danger"
      size="md"
      :busy="uninstalling"
      @confirm="confirmUninstall"
      @cancel="resetUninstallModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { api } from '../../api/client.js';
import AppModal from '../../components/AppModal.vue';
import type { Plugin } from '@mike-games/shared';

const plugins = ref<Plugin[]>([]);
const fileInput = ref<HTMLInputElement>();
const uploadMsg = ref('');
const uploadError = ref(false);
const showUninstallModal = ref(false);
const pendingUninstallId = ref('');
const pendingUninstallName = ref('');
const uninstalling = ref(false);
const uninstallModalMessage = computed(
  () => `Plugin "${pendingUninstallName.value}" wirklich deinstallieren? Alle zugehörigen Daten werden gelöscht.`,
);

async function loadPlugins() {
  const result = await api.get<Plugin[]>('/plugins');
  plugins.value = result.data ?? [];
}

async function handleUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploadMsg.value = '';
  uploadError.value = false;

  try {
    await api.upload('/plugins/install', file);
    uploadMsg.value = 'Plugin erfolgreich installiert.';
    await loadPlugins();
  } catch (e) {
    uploadError.value = true;
    uploadMsg.value = e instanceof Error ? e.message : 'Installation fehlgeschlagen';
  }

  target.value = '';
}

async function togglePlugin(id: string, currentlyEnabled: boolean) {
  await api.put(`/plugins/${id}`, { enabled: !currentlyEnabled });
  await loadPlugins();
}

function openUninstallModal(id: string, name: string) {
  pendingUninstallId.value = id;
  pendingUninstallName.value = name;
  showUninstallModal.value = true;
}

function resetUninstallModal() {
  pendingUninstallId.value = '';
  pendingUninstallName.value = '';
}

async function confirmUninstall() {
  if (!pendingUninstallId.value || uninstalling.value) return;
  uninstalling.value = true;
  try {
    await api.delete(`/plugins/${pendingUninstallId.value}`);
    await loadPlugins();
    showUninstallModal.value = false;
    resetUninstallModal();
  } finally {
    uninstalling.value = false;
  }
}

onMounted(loadPlugins);
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
h2 { font-size: 1.1rem; }

.file-input { display: none; }

.empty-state { text-align: center; padding: 2rem; }

.plugin-list { display: flex; flex-direction: column; gap: 0.75rem; }

.plugin-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plugin-info h3 { margin-bottom: 0.25rem; }

.plugin-meta { font-size: 0.8rem; color: var(--color-text-muted); margin-right: 1rem; }
.plugin-slug { font-size: 0.75rem; color: var(--color-text-muted); font-family: monospace; }

.plugin-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

.error-msg { color: var(--color-danger); font-size: 0.85rem; margin-bottom: 1rem; }
.success-msg { color: var(--color-success); font-size: 0.85rem; margin-bottom: 1rem; }
</style>
