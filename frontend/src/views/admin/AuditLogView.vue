<template>
  <div>
    <h2>Audit-Log</h2>

    <div class="audit-toolbar">
      <input
        v-model="search"
        type="text"
        placeholder="Suche nach Benutzer, Aktion oder Details..."
        class="search-input"
      />
      <span class="result-count">{{ filtered.length }} Eintraege</span>
    </div>

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
        <tr v-for="entry in paged" :key="entry.id">
          <td>{{ formatDate(entry.createdAt) }}</td>
          <td>{{ entry.username || '--' }}</td>
          <td><span class="action-badge">{{ entry.action }}</span></td>
          <td class="details-cell">{{ formatDetails(entry.details) }}</td>
        </tr>
        <tr v-if="paged.length === 0">
          <td colspan="4" class="text-muted">Keine Eintraege.</td>
        </tr>
      </tbody>
    </table>

    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="page <= 1" @click="page--">&laquo;</button>
      <button
        v-for="p in visiblePages"
        :key="p"
        class="page-btn"
        :class="{ active: p === page }"
        @click="page = p"
      >{{ p }}</button>
      <button class="page-btn" :disabled="page >= totalPages" @click="page++">&raquo;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
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
const search = ref('');
const page = ref(1);
const perPage = 50;

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return entries.value;
  return entries.value.filter((e) => {
    const details = formatDetails(e.details).toLowerCase();
    return (
      (e.username || '').toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      details.includes(q)
    );
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)));

const paged = computed(() => {
  const start = (page.value - 1) * perPage;
  return filtered.value.slice(start, start + perPage);
});

const visiblePages = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const current = page.value;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4);
    else start = Math.max(1, end - 4);
  }
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

watch(search, () => { page.value = 1; });

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

.audit-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.search-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: 0.85rem;
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.result-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

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

.pagination {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 1rem;
}

.page-btn {
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: none;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition);
}

.page-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-text-muted);
}

.page-btn.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>
