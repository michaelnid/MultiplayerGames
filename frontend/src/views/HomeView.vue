<template>
  <div class="home">
    <section class="hero">
      <span class="hero-pre">MIKE</span>
      <h1 class="hero-title">Game Library</h1>
      <p class="hero-sub">Dein digitaler Spieleabend -- wuerfle, spiele und gewinne</p>
    </section>

    <section class="actions-section">
      <RouterLink to="/bibliothek" class="action-btn secondary">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        Spielebibliothek
      </RouterLink>
      <button v-if="auth.isLoggedIn" class="action-btn primary" @click="showJoinModal = true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Spiel beitreten
      </button>
      <RouterLink v-if="!auth.isLoggedIn" to="/login" class="action-btn login">
        Anmelden und losspielen
      </RouterLink>
    </section>

    <!-- Join Modal -->
    <Teleport to="body">
      <div v-if="showJoinModal" class="modal-overlay" @click="closeModal">
        <div class="modal card" @click.stop>
          <div class="modal-header">
            <h3>Spiel beitreten</h3>
            <button class="modal-close" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p class="modal-sub">Gib den 4-stelligen PIN ein, den der Host dir mitgeteilt hat.</p>
          <form @submit.prevent="joinLobby" class="join-form">
            <input
              ref="pinInput"
              v-model="lobbyCode"
              type="text"
              placeholder="0000"
              maxlength="4"
              pattern="\d{4}"
              inputmode="numeric"
              class="pin-input"
              autofocus
            />
            <button type="submit" class="btn-primary join-submit">Beitreten</button>
          </form>
          <p v-if="joinError" class="join-error">{{ joinError }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';

const auth = useAuthStore();
const router = useRouter();

const showJoinModal = ref(false);
const lobbyCode = ref('');
const joinError = ref('');
const pinInput = ref<HTMLInputElement | null>(null);

watch(showJoinModal, async (open) => {
  if (open) {
    lobbyCode.value = '';
    joinError.value = '';
    await nextTick();
    pinInput.value?.focus();
  }
});

function closeModal() {
  showJoinModal.value = false;
}

async function joinLobby() {
  joinError.value = '';
  if (!/^\d{4}$/.test(lobbyCode.value)) {
    joinError.value = 'Bitte einen 4-stelligen PIN eingeben';
    return;
  }
  try {
    const result = await api.post<{ lobbyId: string }>('/lobbies/join', { code: lobbyCode.value });
    if (result.data?.lobbyId) {
      showJoinModal.value = false;
      router.push(`/multiplayer/${result.data.lobbyId}`);
    }
  } catch (e) {
    joinError.value = e instanceof Error ? e.message : 'Beitritt fehlgeschlagen';
  }
}
</script>

<style scoped>
.home {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.hero {
  text-align: center;
  padding: 4rem 0 3rem;
}

.hero-pre {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: #1A1A2E;
  background-color: var(--color-primary);
  padding: 0.2rem 0.8rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  margin-bottom: 0.75rem;
}

.hero-title {
  font-size: 4.5rem;
  line-height: 1.05;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.hero-sub {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  max-width: 500px;
  margin: 0 auto;
  font-weight: 400;
}

.actions-section {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 0 4rem;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 2rem;
  border-radius: var(--radius);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 2px solid var(--color-border);
  transition: all var(--transition);
  box-shadow: var(--shadow);
  cursor: pointer;
  font-family: var(--font-primary);
}

.action-btn:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

.action-btn.primary {
  background-color: var(--color-primary);
  color: #1A1A2E;
}

.action-btn.primary:hover {
  background-color: var(--color-primary-hover);
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}

.action-btn.secondary {
  background-color: var(--color-bg-card);
  color: var(--color-text);
}

.action-btn.secondary:hover {
  background-color: var(--color-bg-hover);
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}

.action-btn.login {
  background-color: var(--color-secondary);
  color: white;
}

.action-btn.login:hover {
  background-color: var(--color-secondary-hover);
  color: white;
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-lg);
}

/* --- Join Modal --- */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background-color: rgba(28, 41, 60, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-header h3 {
  font-size: 1.2rem;
  font-weight: 800;
}

.modal-close {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  padding: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.modal-close:hover {
  background-color: var(--color-bg-hover);
}

.modal-sub {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  text-align: left;
}

.join-form {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.pin-input {
  width: 140px;
  font-size: 1.8rem;
  text-align: center;
  letter-spacing: 8px;
  font-weight: 800;
  padding: 0.5rem;
}

.join-submit {
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
}

.join-error {
  color: var(--color-danger);
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.75rem;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero {
    padding: 2.5rem 0 2rem;
  }

  .actions-section {
    flex-direction: column;
    align-items: center;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
