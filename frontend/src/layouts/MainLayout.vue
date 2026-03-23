<template>
  <div class="app-layout">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/" class="topbar-brand">
          <span class="brand-icon">M</span>
          <span class="brand-text">
            <small>MIKE</small>
            Game Library
          </span>
        </RouterLink>

        <nav class="topbar-nav">
          <RouterLink to="/" class="nav-link" exact-active-class="active">Home</RouterLink>
          <RouterLink to="/bibliothek" class="nav-link" active-class="active">Bibliothek</RouterLink>
          <RouterLink to="/multiplayer" class="nav-link" active-class="active">Multiplayer</RouterLink>
          <RouterLink to="/highscores" class="nav-link" active-class="active">Highscores</RouterLink>
        </nav>

        <div class="topbar-actions">
          <button class="sound-toggle" @click="sound.toggle()" :title="sound.isMuted ? 'Ton aktivieren' : 'Ton deaktivieren'">
            <svg v-if="!sound.isMuted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          </button>
          <RouterLink v-if="auth.isAdmin" to="/admin" class="btn-admin" active-class="btn-admin--active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Admin
          </RouterLink>
          <div class="user-chip">
            <RouterLink to="/profil" class="user-chip-name">{{ auth.user?.username }}</RouterLink>
            <button class="user-chip-logout" @click="handleLogout" title="Abmelden">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <RouterView />
    </main>

    <footer v-if="!isLobbyRoute" class="public-footer">
      <div class="footer-inner">
        <span class="footer-brand">MIKE Game Library</span>
        <div class="footer-links">
          <a href="https://mike-server.eu/" class="footer-link" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            mike-server.eu
          </a>
          <span class="footer-sep">|</span>
          <a href="https://github.com/michaelnid" class="footer-link" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
        </div>
      </div>
    </footer>

    <div class="portrait-hint">
      <svg class="portrait-hint-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/>
      </svg>
      <p class="portrait-hint-text">Bitte drehe dein Geraet ins Querformat</p>
      <p class="portrait-hint-sub">Diese Seite ist fuer Landscape-Modus optimiert</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useSoundStore } from '../stores/sound.js';

const auth = useAuthStore();
const sound = useSoundStore();
const router = useRouter();
const route = useRoute();

const isLobbyRoute = computed(() => route.name === 'lobby');

async function handleLogout() {
  await auth.logout();
  router.push('/');
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  border-bottom: 3px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-bg-card);
  border-bottom: 2px solid var(--color-border);
}

.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: var(--color-text);
  flex-shrink: 0;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: var(--radius);
  border: 2px solid var(--color-border);
  background-color: var(--color-primary);
  color: #1A1A2E;
  font-weight: 900;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  font-weight: 800;
  font-size: 0.95rem;
}

.brand-text small {
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.topbar-nav {
  display: flex;
  gap: 0.25rem;
  flex: 1;
}

.nav-link {
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  transition: all var(--transition);
  border: 2px solid transparent;
}

.nav-link:hover {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
  border-color: var(--color-border);
}

.nav-link.active {
  color: #1A1A2E;
  background-color: var(--color-primary);
  border-color: var(--color-border);
  box-shadow: var(--shadow-sm);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.sound-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  background-color: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition);
  box-shadow: none;
}

.sound-toggle:hover {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}

.sound-toggle:active {
  transform: none;
}

.btn-admin {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: var(--radius);
  background-color: var(--color-danger);
  border: 2px solid var(--color-border);
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition);
}

.btn-admin:hover {
  transform: translate(-1px, -1px);
  box-shadow: var(--shadow);
  color: white;
}

.btn-admin--active {
  box-shadow: var(--shadow);
}

.user-chip {
  display: flex;
  align-items: center;
  background-color: var(--color-bg-card);
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.user-chip-name {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text);
  text-decoration: none;
  transition: background-color var(--transition);
}

.user-chip-name:hover {
  background-color: var(--color-primary);
  color: #1A1A2E;
}

.user-chip-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.6rem;
  background: none;
  border: none;
  border-left: 2px solid var(--color-border);
  border-radius: 0;
  color: var(--color-text-muted);
  cursor: pointer;
  box-shadow: none;
  transition: all var(--transition);
}

.user-chip-logout:hover {
  color: white;
  background-color: var(--color-danger);
}

.user-chip-logout:active {
  transform: none;
}

.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  width: 100%;
}

.public-footer {
  border-top: 3px solid var(--color-border);
  padding: 1.5rem;
  background-color: var(--color-bg-card);
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.footer-brand {
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer-sep {
  opacity: 0.3;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-text-muted);
  text-decoration: none;
  font-weight: 600;
  transition: color var(--transition);
}

.footer-link:hover {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .topbar-inner {
    padding: 0 1rem;
    gap: 1rem;
  }

  .topbar-nav {
    gap: 0;
  }

  .nav-link {
    padding: 0.4rem 0.5rem;
    font-size: 0.75rem;
  }

  .brand-text {
    display: none;
  }

  .main-content {
    padding: 1.5rem 1rem;
  }
}
</style>
