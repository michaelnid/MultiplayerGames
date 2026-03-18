<template>
  <div>
    <h2>Audit-Log</h2>

    <table class="data-table">
      <thead>
        <tr>
          <th>Zeitpunkt</th>
          <th>Benutzer</th>
          <th>Aktion</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.id">
          <td>{{ formatDate(entry.createdAt) }}</td>
          <td>{{ entry.username || '--' }}</td>
          <td><span class="action-badge">{{ entry.action }}</span></td>
          <td class="details-cell">{{ formatDetails(entry.details) }}</td>
        </tr>
        <tr v-if="entries.length === 0">
          <td colspan="4" class="text-muted">Keine Eintraege.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../api/client.js';

interface AuditEntry {
  id: number;
  userId: string | null;
  username: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

const entries = ref<AuditEntry[]>([]);

onMounted(async () => {
  try {
    const result = await api.get<AuditEntry[]>('/stats/audit-log');
    entries.value = result.data ?? [];
  } catch {
    // Keine Eintraege
  }
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('de-DE');
}

function formatDetails(details: Record<string, unknown>) {
  const entries = Object.entries(details);
  if (entries.length === 0) return '--';
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}
</script>

<style scoped>
h2 { font-size: 1.1rem; margin-bottom: 1rem; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 0.625rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.data-table th {
  background-color: var(--color-bg-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.action-badge {
  background-color: var(--color-bg-hover);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: monospace;
}

.details-cell {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-muted);
}

.text-muted { color: var(--color-text-muted); text-align: center; }
</style>
