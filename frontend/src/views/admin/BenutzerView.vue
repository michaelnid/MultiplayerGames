<template>
  <div>
    <div class="section-header">
      <h2>Benutzerverwaltung</h2>
      <button class="btn-primary" @click="showCreate = true">Benutzer erstellen</button>
    </div>

    <div v-if="showCreate" class="card create-form">
      <h3>Neuer Benutzer</h3>
      <form @submit.prevent="createUser">
        <div class="form-row">
          <div class="form-group">
            <label>Benutzername</label>
            <input v-model="newUser.username" type="text" minlength="3" maxlength="32" pattern="^[a-zA-Z0-9_-]+$" required />
          </div>
          <div class="form-group">
            <label>Passwort</label>
            <input v-model="newUser.password" type="password" minlength="8" required />
          </div>
          <div class="form-group">
            <label>Rolle</label>
            <select v-model="newUser.role">
              <option value="spieler">Spieler</option>
              <option value="gamemaster">Game Master</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Erstellen</button>
          <button type="button" class="btn-secondary" @click="showCreate = false">Abbrechen</button>
        </div>
        <p v-if="createError" class="error-msg">{{ createError }}</p>
      </form>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Benutzername</th>
          <th>Rolle</th>
          <th>2FA</th>
          <th>Erstellt</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.username }}</td>
          <td>
            <select
              :value="u.role"
              @change="updateRole(u.id, ($event.target as HTMLSelectElement).value)"
              class="role-select"
            >
              <option value="spieler">Spieler</option>
              <option value="gamemaster">Game Master</option>
              <option value="admin">Administrator</option>
            </select>
          </td>
          <td>{{ u.totpEnabled ? 'Aktiv' : '--' }}</td>
          <td>{{ formatDate(u.createdAt) }}</td>
          <td>
            <button class="btn-danger btn-sm" @click="deleteUser(u.id, u.username)">Loeschen</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../api/client.js';
import type { User, UserRole } from '@mike-games/shared';

const users = ref<User[]>([]);
const showCreate = ref(false);
const createError = ref('');
const newUser = ref({ username: '', password: '', role: 'spieler' as UserRole });

async function loadUsers() {
  const result = await api.get<User[]>('/users');
  users.value = result.data ?? [];
}

async function createUser() {
  createError.value = '';
  try {
    await api.post('/users', newUser.value);
    showCreate.value = false;
    newUser.value = { username: '', password: '', role: 'spieler' };
    await loadUsers();
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Fehler beim Erstellen';
  }
}

async function updateRole(id: string, role: string) {
  await api.put(`/users/${id}`, { role });
  await loadUsers();
}

async function deleteUser(id: string, username: string) {
  if (!confirm(`Benutzer "${username}" wirklich loeschen?`)) return;
  await api.delete(`/users/${id}`);
  await loadUsers();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE');
}

onMounted(loadUsers);
</script>

<style scoped>
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

h2 { font-size: 1.1rem; }
h3 { font-size: 1rem; margin-bottom: 1rem; }

.create-form { margin-bottom: 1rem; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-actions { display: flex; gap: 0.5rem; }
.error-msg { color: var(--color-danger); font-size: 0.85rem; margin-top: 0.5rem; }

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
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.data-table th {
  background-color: var(--color-bg-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.data-table td { font-size: 0.875rem; }

.role-select {
  width: auto;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
</style>
