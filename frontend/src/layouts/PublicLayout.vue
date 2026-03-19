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
          <RouterLink v-if="auth.isLoggedIn" to="/dashboard" class="nav-link" active-class="active">Dashboard</RouterLink>
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
        <span>MIKE Game Library</span>
        <span class="footer-sep">--</span>
        <span>Multiplayer Game System</span>
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
  padding: 1.25rem;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.footer-sep {
  margin: 0 0.5rem;
  opacity: 0.5;
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
