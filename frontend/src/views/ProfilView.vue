<template>
  <div class="profil">
    <h1>Profil</h1>

    <div class="profil-grid">
      <div class="card">
        <h2>Kontoinformationen</h2>
        <div class="info-row">
          <span class="info-label">Benutzername</span>
          <span>{{ auth.user?.username }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rolle</span>
          <span class="role-badge">{{ roleName }}</span>
        </div>
      </div>

      <div class="card">
        <h2>Passwort aendern</h2>
        <form @submit.prevent="handleChangePassword" class="password-form">
          <div class="form-group">
            <label for="currentPassword">Aktuelles Passwort</label>
            <input id="currentPassword" v-model="currentPassword" type="password" required />
          </div>
          <div class="form-group">
            <label for="newPassword">Neues Passwort</label>
            <input id="newPassword" v-model="newPassword" type="password" minlength="8" required />
          </div>
          <p v-if="pwError" class="error-msg">{{ pwError }}</p>
          <p v-if="pwSuccess" class="success-msg">Passwort erfolgreich geaendert.</p>
          <button type="submit" class="btn-primary">Passwort aendern</button>
        </form>
      </div>
    </div>

    <div class="card">
      <h2>Meine Statistiken</h2>
      <p class="text-muted">Statistiken werden in Phase 7 implementiert.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();

const currentPassword = ref('');
const newPassword = ref('');
const pwError = ref('');
const pwSuccess = ref(false);

const roleName = computed(() => {
  const map: Record<string, string> = {
    admin: 'Administrator',
    gamemaster: 'Game Master',
    spieler: 'Spieler',
  };
  return map[auth.user?.role ?? ''] ?? auth.user?.role;
});

async function handleChangePassword() {
  pwError.value = '';
  pwSuccess.value = false;
  try {
    await auth.changePassword(currentPassword.value, newPassword.value);
    pwSuccess.value = true;
    currentPassword.value = '';
    newPassword.value = '';
  } catch (e) {
    pwError.value = e instanceof Error ? e.message : 'Fehler beim Aendern';
  }
}
</script>

<style scoped>
.profil h1 { margin-bottom: 1.5rem; }

.profil-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h2 { font-size: 1.1rem; margin-bottom: 1rem; }

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.info-label { color: var(--color-text-muted); }

.role-badge {
  background-color: var(--color-primary);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group { display: flex; flex-direction: column; gap: 0.25rem; }

.error-msg { color: var(--color-danger); font-size: 0.85rem; }
.success-msg { color: var(--color-success); font-size: 0.85rem; }
.text-muted { color: var(--color-text-muted); }

@media (max-width: 768px) {
  .profil-grid { grid-template-columns: 1fr; }
}
</style>
