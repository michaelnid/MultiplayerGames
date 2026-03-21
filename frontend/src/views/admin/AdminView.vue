<template>
  <div class="admin">
    <h1>Administration</h1>

    <nav class="admin-tabs">
      <RouterLink to="/admin" :class="{ active: route.name === 'admin-uebersicht' }" class="tab">Uebersicht</RouterLink>
      <RouterLink to="/admin/benutzer" class="tab" active-class="active">Benutzer</RouterLink>
      <RouterLink to="/admin/aktive-lobbys" class="tab" active-class="active">Aktive Lobbys</RouterLink>
      <RouterLink to="/admin/plugins" class="tab" active-class="active">Plugins</RouterLink>
      <RouterLink to="/admin/spieleinstellungen" class="tab" active-class="active">Spieleinstellungen</RouterLink>
      <RouterLink to="/admin/system" class="tab" active-class="active">System</RouterLink>
      <RouterLink to="/admin/audit-log" class="tab" active-class="active">Audit-Log</RouterLink>
    </nav>

    <div class="admin-content">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
</script>

<style scoped>
.admin h1 { margin-bottom: 1rem; }

.admin-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.tab {
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all var(--transition);
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
</style>
