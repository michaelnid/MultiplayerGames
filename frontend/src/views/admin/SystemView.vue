<template>
  <div>
    <h2>System-Status</h2>

    <div class="system-grid">
      <div class="card">
        <h3>Server</h3>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="status-ok">Online</span>
        </div>
        <div class="info-row">
          <span class="info-label">Core-Version</span>
          <span>{{ health.version || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Uptime</span>
          <span>{{ health.uptime || '--' }}</span>
        </div>
      </div>

      <div class="card">
        <h3>Ressourcen</h3>
        <div class="info-row">
          <span class="info-label">RAM-Verbrauch</span>
          <span>{{ health.memoryUsage || '--' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">CPU-Last</span>
          <span>{{ health.cpuUsage || '--' }}</span>
        </div>
      </div>

      <div class="card">
        <h3>pgAdmin 4</h3>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span :class="dbAdmin.enabled ? 'status-ok' : 'status-warning'">
            {{ dbAdmin.enabled ? 'Konfiguriert' : 'Nicht konfiguriert' }}
          </span>
        </div>
        <p class="hint-text" v-if="!dbAdmin.enabled">
          Setze <code>PGADMIN_URL</code> in der Server-<code>.env</code>, um den Zugriff zu aktivieren.
        </p>
        <button
          class="btn-secondary db-admin-button"
          :disabled="!dbAdmin.enabled || !dbAdmin.url"
          @click="openDbAdmin"
        >
          pgAdmin öffnen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../api/client.js';

interface HealthData {
  version: string;
  uptime: string;
  memoryUsage: string;
  cpuUsage: string;
}

interface DbAdminData {
  tool: string;
  enabled: boolean;
  url: string | null;
}

const health = ref<Partial<HealthData>>({});
const dbAdmin = ref<DbAdminData>({
  tool: 'pgadmin4',
  enabled: false,
  url: null,
});

async function loadHealth() {
  try {
    const result = await api.get<HealthData>('/stats/health');
    health.value = result.data ?? {};
  } catch {
    // Server nicht erreichbar
  }
}

async function loadDbAdmin() {
  try {
    const result = await api.get<DbAdminData>('/stats/db-admin');
    if (result.data) dbAdmin.value = result.data;
  } catch {
    dbAdmin.value = { tool: 'pgadmin4', enabled: false, url: null };
  }
}

function openDbAdmin() {
  if (!dbAdmin.value.url) return;
  window.open(dbAdmin.value.url, '_blank', 'noopener,noreferrer');
}

onMounted(async () => {
  await Promise.all([loadHealth(), loadDbAdmin()]);
});
</script>

<style scoped>
h2 { font-size: 1.1rem; margin-bottom: 1rem; }
h3 { font-size: 0.95rem; margin-bottom: 0.75rem; }

.system-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.875rem;
}

.info-label { color: var(--color-text-muted); }
.status-ok { color: var(--color-success); font-weight: 600; }
.status-warning { color: var(--color-warning); font-weight: 600; }

.hint-text {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0.75rem 0;
}

.db-admin-button {
  margin-top: 0.25rem;
}

.db-admin-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
