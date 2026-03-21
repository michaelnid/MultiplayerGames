<template>
  <div>
    <div class="section-header">
      <h2>Benutzerverwaltung</h2>
      <button class="btn-primary" @click="showCreate = true">Benutzer erstellen</button>
    </div>

    <div v-if="showCreate" class="card form-card">
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

    <div v-if="editUser" class="card form-card">
      <h3>Benutzer bearbeiten: {{ editUser.username }}</h3>
      <form @submit.prevent="saveEdit">
        <div class="form-row">
          <div class="form-group">
            <label>Benutzername</label>
            <input v-model="editData.username" type="text" minlength="3" maxlength="32" pattern="^[a-zA-Z0-9_-]+$" required />
          </div>
          <div class="form-group">
            <label>Rolle</label>
            <select v-model="editData.role">
              <option value="spieler">Spieler</option>
              <option value="gamemaster">Game Master</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div class="form-group">
            <label>Neues Passwort (leer lassen = nicht ändern)</label>
            <input v-model="editData.password" type="password" minlength="8" placeholder="Neues Passwort..." />
          </div>
        </div>
        <div v-if="editUser.totpEnabled" class="form-group totp-section">
          <label>2FA ist aktiv</label>
          <button type="button" class="btn-danger btn-sm" @click="requestDisable2FA">2FA deaktivieren</button>
        </div>
        <div class="form-group totp-section">
          <label>Statistik</label>
          <button type="button" class="btn-danger btn-sm" @click="requestResetStats">Statistik zuruecksetzen</button>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Speichern</button>
          <button type="button" class="btn-secondary" @click="editUser = null">Abbrechen</button>
        </div>
        <p v-if="editError" class="error-msg">{{ editError }}</p>
        <p v-if="editSuccess" class="success-msg">{{ editSuccess }}</p>
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
            <span class="role-badge" :class="'role-' + u.role">{{ roleLabel(u.role) }}</span>
          </td>
          <td>
            <span v-if="u.totpEnabled" class="badge-active">Aktiv</span>
            <span v-else class="badge-inactive">--</span>
          </td>
          <td>{{ formatDate(u.createdAt) }}</td>
          <td class="actions-cell">
            <button class="btn-edit" @click="openEdit(u)">Bearbeiten</button>
            <button class="btn-danger btn-sm" @click="requestDeleteUser(u.id, u.username)">Löschen</button>
          </td>
        </tr>
      </tbody>
    </table>

    <AppModal
      v-model="showConfirmModal"
      :title="confirmModalTitle"
      :message="confirmModalMessage"
      :confirm-text="confirmModalConfirmText"
      cancel-text="Abbrechen"
      busy-text="Bitte warten..."
      confirm-variant="danger"
      size="md"
      :busy="confirmBusy"
      @confirm="runConfirmedAction"
      @cancel="resetConfirmModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { api } from '../../api/client.js';
import AppModal from '../../components/AppModal.vue';
import type { User, UserRole } from '@mike-games/shared';

const users = ref<User[]>([]);
const showCreate = ref(false);
const createError = ref('');
const newUser = ref({ username: '', password: '', role: 'spieler' as UserRole });

const editUser = ref<User | null>(null);
const editData = ref({ username: '', role: '' as UserRole, password: '' });
const editError = ref('');
const editSuccess = ref('');
const showConfirmModal = ref(false);
const confirmType = ref<'disable2fa' | 'delete-user' | 'reset-stats' | null>(null);
const confirmTargetId = ref('');
const confirmTargetUsername = ref('');
const confirmBusy = ref(false);

const confirmModalTitle = computed(() => {
  if (confirmType.value === 'disable2fa') return '2FA deaktivieren';
  if (confirmType.value === 'delete-user') return 'Benutzer löschen';
  if (confirmType.value === 'reset-stats') return 'Statistik zuruecksetzen';
  return 'Bestätigung';
});

const confirmModalMessage = computed(() => {
  if (confirmType.value === 'disable2fa') {
    return `2FA für "${confirmTargetUsername.value}" wirklich deaktivieren?`;
  }
  if (confirmType.value === 'delete-user') {
    return `Benutzer "${confirmTargetUsername.value}" wirklich löschen?`;
  }
  if (confirmType.value === 'reset-stats') {
    return `Alle Statistiken (Siege, Niederlagen, Punkte) von "${confirmTargetUsername.value}" wirklich zuruecksetzen? Dies kann nicht rueckgaengig gemacht werden.`;
  }
  return '';
});

const confirmModalConfirmText = computed(() => {
  if (confirmType.value === 'disable2fa') return '2FA deaktivieren';
  if (confirmType.value === 'delete-user') return 'Löschen';
  if (confirmType.value === 'reset-stats') return 'Zuruecksetzen';
  return 'Bestätigen';
});

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

function openEdit(user: User) {
  editUser.value = user;
  editData.value = { username: user.username, role: user.role as UserRole, password: '' };
  editError.value = '';
  editSuccess.value = '';
  showCreate.value = false;
}

async function saveEdit() {
  if (!editUser.value) return;
  editError.value = '';
  editSuccess.value = '';

  const body: Record<string, string> = {};
  const trimmedUsername = editData.value.username.trim();
  if (trimmedUsername !== editUser.value.username) {
    if (trimmedUsername.length < 3) {
      editError.value = 'Benutzername muss mindestens 3 Zeichen lang sein';
      return;
    }
    body.username = trimmedUsername;
  }
  if (editData.value.role !== editUser.value.role) {
    body.role = editData.value.role;
  }
  if (editData.value.password.length > 0) {
    if (editData.value.password.length < 8) {
      editError.value = 'Passwort muss mindestens 8 Zeichen lang sein';
      return;
    }
    body.password = editData.value.password;
  }

  if (Object.keys(body).length === 0) {
    editError.value = 'Keine Änderungen vorgenommen';
    return;
  }

  try {
    await api.put(`/users/${editUser.value.id}`, body);
    editSuccess.value = 'Änderungen gespeichert';
    editData.value.password = '';
    await loadUsers();
    const updated = users.value.find(u => u.id === editUser.value?.id);
    if (updated) editUser.value = updated;
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Fehler beim Speichern';
  }
}

function requestDisable2FA() {
  if (!editUser.value) return;
  confirmType.value = 'disable2fa';
  confirmTargetId.value = editUser.value.id;
  confirmTargetUsername.value = editUser.value.username;
  showConfirmModal.value = true;
}

function requestResetStats() {
  if (!editUser.value) return;
  confirmType.value = 'reset-stats';
  confirmTargetId.value = editUser.value.id;
  confirmTargetUsername.value = editUser.value.username;
  showConfirmModal.value = true;
}

function requestDeleteUser(id: string, username: string) {
  confirmType.value = 'delete-user';
  confirmTargetId.value = id;
  confirmTargetUsername.value = username;
  showConfirmModal.value = true;
}

function resetConfirmModal() {
  confirmType.value = null;
  confirmTargetId.value = '';
  confirmTargetUsername.value = '';
}

async function runConfirmedAction() {
  if (!confirmType.value || !confirmTargetId.value || confirmBusy.value) return;
  confirmBusy.value = true;

  try {
    if (confirmType.value === 'disable2fa') {
      await api.put(`/users/${confirmTargetId.value}`, { disable2fa: true });
      editSuccess.value = '2FA deaktiviert';
      await loadUsers();
      const updated = users.value.find((u) => u.id === confirmTargetId.value);
      if (updated && editUser.value?.id === updated.id) {
        editUser.value = updated;
      }
    } else if (confirmType.value === 'reset-stats') {
      await api.delete(`/users/${confirmTargetId.value}/stats`);
      editSuccess.value = 'Statistik zurueckgesetzt';
    } else if (confirmType.value === 'delete-user') {
      await api.delete(`/users/${confirmTargetId.value}`);
      if (editUser.value?.id === confirmTargetId.value) {
        editUser.value = null;
      }
      await loadUsers();
    }

    showConfirmModal.value = false;
    resetConfirmModal();
  } catch (e) {
    editError.value = e instanceof Error ? e.message : 'Fehler';
  } finally {
    confirmBusy.value = false;
  }
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    admin: 'Administrator',
    gamemaster: 'Game Master',
    spieler: 'Spieler',
  };
  return map[role] ?? role;
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

.form-card { margin-bottom: 1rem; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-actions { display: flex; gap: 0.5rem; }
.error-msg { color: var(--color-danger); font-size: 0.85rem; margin-top: 0.5rem; }
.success-msg { color: var(--color-success); font-size: 0.85rem; margin-top: 0.5rem; }

.totp-section {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-direction: row;
}

.totp-section label {
  margin-bottom: 0;
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

.role-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.role-admin { background-color: rgba(239, 68, 68, 0.15); color: #ef4444; }
.role-gamemaster { background-color: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.role-spieler { background-color: rgba(99, 102, 241, 0.15); color: #6366f1; }

.badge-active { color: var(--color-success); font-size: 0.85rem; font-weight: 500; }
.badge-inactive { color: var(--color-text-muted); font-size: 0.85rem; }

.actions-cell {
  display: flex;
  gap: 0.5rem;
}

.btn-edit {
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  background-color: var(--color-bg-hover);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition);
}

.btn-edit:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-sm { padding: 0.25rem 0.6rem; font-size: 0.75rem; }

@media (max-width: 768px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
