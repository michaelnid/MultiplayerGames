<template>
  <div class="public-layout">
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
          <RouterLink v-if="auth.isLoggedIn" to="/multiplayer" class="nav-link" active-class="active">Multiplayer</RouterLink>
          <RouterLink to="/highscores" class="nav-link" active-class="active">Highscores</RouterLink>
        </nav>

        <div class="topbar-actions">
          <template v-if="auth.isLoggedIn">
            <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-link">Admin</RouterLink>
            <RouterLink to="/profil" class="nav-link">{{ auth.user?.username }}</RouterLink>
            <button class="btn-logout" @click="handleLogout">Abmelden</button>
          </template>
          <RouterLink v-else to="/login" class="btn-login">Anmelden</RouterLink>
        </div>
      </div>
    </header>

    <main class="public-content">
      <RouterView />
    </main>

    <footer class="public-footer">
      <div class="footer-inner">
        <span class="footer-brand">MIKE Game Library</span>
        <div class="footer-links">
          <a href="https://mike-server.eu/" class="footer-link" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
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
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await auth.logout();
  router.push('/');
}
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  background-color: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(12px);
  background-color: rgba(26, 29, 39, 0.9);
}

.topbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 60px;
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
  width: 36px;
  height: 36px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--color-primary), #8b5cf6);
  color: white;
  font-weight: 800;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  font-weight: 700;
  font-size: 0.95rem;
}

.brand-text small {
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--color-primary);
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
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition);
}

.nav-link:hover {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}

.nav-link.active {
  color: var(--color-primary);
  background-color: rgba(99, 102, 241, 0.1);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-login {
  padding: 0.45rem 1.1rem;
  border-radius: 20px;
  background-color: var(--color-primary);
  color: white;
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: background-color var(--transition);
}

.btn-login:hover {
  background-color: var(--color-primary-hover);
  color: white;
}

.btn-logout {
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius);
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-logout:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.public-content {
  flex: 1;
}

.public-footer {
  border-top: 1px solid var(--color-border);
  padding: 1.5rem;
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
  font-weight: 600;
  letter-spacing: 0.02em;
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
    font-size: 0.8rem;
  }

  .brand-text {
    display: none;
  }
}
</style>
