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

const health = ref<Partial<HealthData>>({});

onMounted(async () => {
  try {
    const result = await api.get<HealthData>('/health');
    health.value = result.data ?? {};
  } catch {
    // Server nicht erreichbar
  }
});
</script>

<style scoped>
h2 { font-size: 1.1rem; margin-bottom: 1rem; }
h3 { font-size: 0.95rem; margin-bottom: 0.75rem; }

.system-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
</style>
