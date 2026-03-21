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

        <div v-if="requiresTOTP" class="form-group">
          <label for="totpCode">2FA-Code oder Backup-Code</label>
          <input
            id="totpCode"
            v-model="totpCode"
            type="text"
            autocomplete="one-time-code"
            required
            :disabled="loading"
            placeholder="123456 oder ABCD-1234"
          />
        </div>

        <p v-if="requiresTOTP && !error" class="info-msg">
          Bitte gib den aktuellen 2FA-Code ein. Alternativ kannst du einen Backup-Code verwenden.
        </p>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary login-btn" :disabled="loading">
          {{ loading ? 'Anmelden...' : (requiresTOTP ? '2FA bestaetigen' : 'Anmelden') }}
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
const totpCode = ref('');
const error = ref('');
const loading = ref(false);
const requiresTOTP = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const result = await auth.login(
      username.value,
      password.value,
      requiresTOTP.value ? totpCode.value : undefined,
    );

    if (result.data?.requiresTOTP) {
      requiresTOTP.value = true;
      return;
    }

    requiresTOTP.value = false;
    totpCode.value = '';
    router.push('/');
  } catch (e) {
    if (!requiresTOTP.value) {
      totpCode.value = '';
    }
    error.value = e instanceof Error ? e.message : 'Anmeldung fehlgeschlagen';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
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

.info-msg {
  color: var(--color-text-muted);
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
