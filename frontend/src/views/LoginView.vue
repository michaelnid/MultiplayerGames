<template>
  <div class="login-page">
    <div class="login-card card">
      <h1 class="login-title">MIKE</h1>
      <p class="login-subtitle">Multiplayer Games</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">Benutzername</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password">Passwort</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary login-btn" :disabled="loading">
          {{ loading ? 'Anmelden...' : 'Anmelden' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg);
}

.login-card {
  width: 100%;
  max-width: 380px;
  text-align: center;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 3px;
}

.login-subtitle {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 2rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  text-align: left;
}

.error-msg {
  color: var(--color-danger);
  font-size: 0.85rem;
  text-align: center;
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  margin-top: 0.5rem;
}
</style>
