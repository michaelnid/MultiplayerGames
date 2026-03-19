<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="logo">MIKE</h2>
        <span class="logo-sub">Multiplayer Games</span>
      </div>

      <nav class="nav-main">
        <RouterLink to="/" class="nav-item" exact-active-class="active">
          <BibliothekIcon />
          <span>Home</span>
        </RouterLink>
        <RouterLink to="/dashboard" class="nav-item" active-class="active">
          <DashboardIcon />
          <span>Dashboard</span>
        </RouterLink>
        <RouterLink to="/bibliothek" class="nav-item" active-class="active">
          <BibliothekIcon />
          <span>Bibliothek</span>
        </RouterLink>
        <RouterLink to="/multiplayer" class="nav-item" active-class="active">
          <MultiplayerIcon />
          <span>Multiplayer</span>
        </RouterLink>
      </nav>

      <div class="nav-spacer"></div>

      <nav class="nav-bottom">
        <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-item" active-class="active">
          <AdminIcon />
          <span>Admin</span>
        </RouterLink>
        <RouterLink to="/profil" class="nav-item" active-class="active">
          <ProfilIcon />
          <span>{{ auth.user?.username }}</span>
        </RouterLink>
        <button class="nav-item logout-btn" @click="handleLogout">
          <LogoutIcon />
          <span>Abmelden</span>
        </button>
      </nav>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import DashboardIcon from '../components/icons/DashboardIcon.vue';
import BibliothekIcon from '../components/icons/BibliothekIcon.vue';
import MultiplayerIcon from '../components/icons/MultiplayerIcon.vue';
import AdminIcon from '../components/icons/AdminIcon.vue';
import ProfilIcon from '../components/icons/ProfilIcon.vue';
import LogoutIcon from '../components/icons/LogoutIcon.vue';

const auth = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 1rem 0;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 0.5rem 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.5rem;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary);
  letter-spacing: 2px;
}

.logo-sub {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.nav-main,
.nav-bottom {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.25rem 0.75rem;
}

.nav-spacer {
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all var(--transition);
  text-decoration: none;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  color: var(--color-text);
  background-color: var(--color-bg-hover);
}

.nav-item.active {
  color: var(--color-primary);
  background-color: rgba(99, 102, 241, 0.1);
}

.nav-bottom {
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.logout-btn {
  color: var(--color-text-muted);
}

.logout-btn:hover {
  color: var(--color-danger);
}

.content {
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  min-height: 100vh;
}
</style>
