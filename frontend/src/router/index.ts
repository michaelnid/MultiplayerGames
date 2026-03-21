import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/PublicLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'bibliothek',
          name: 'bibliothek',
          component: () => import('../views/BibliothekView.vue'),
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('../views/LoginView.vue'),
          meta: { guest: true },
        },
      ],
    },
    {
      path: '/',
      component: () => import('../layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          redirect: { name: 'profil' },
        },
        {
          path: 'multiplayer',
          name: 'multiplayer',
          component: () => import('../views/MultiplayerView.vue'),
        },
        {
          path: 'multiplayer/:lobbyId',
          name: 'lobby',
          component: () => import('../views/LobbyView.vue'),
          props: true,
        },
        {
          path: 'profil',
          name: 'profil',
          component: () => import('../views/ProfilView.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('../views/admin/AdminView.vue'),
          meta: { requiresAdmin: true },
          children: [
            {
              path: '',
              name: 'admin-uebersicht',
              component: () => import('../views/admin/AdminUebersichtView.vue'),
            },
            {
              path: 'benutzer',
              name: 'admin-benutzer',
              component: () => import('../views/admin/BenutzerView.vue'),
            },
            {
              path: 'aktive-lobbys',
              name: 'admin-aktive-lobbys',
              component: () => import('../views/admin/AktiveLobbysView.vue'),
            },
            {
              path: 'plugins',
              name: 'admin-plugins',
              component: () => import('../views/admin/PluginsView.vue'),
            },
            {
              path: 'spieleinstellungen',
              name: 'admin-spieleinstellungen',
              component: () => import('../views/admin/SpieleinstellungenView.vue'),
            },
            {
              path: 'spieleinstellungen/:slug',
              name: 'admin-plugin-settings',
              component: () => import('../views/admin/PluginSettingsView.vue'),
              props: true,
            },
            {
              path: 'system',
              name: 'admin-system',
              component: () => import('../views/admin/SystemView.vue'),
            },
            {
              path: 'audit-log',
              name: 'admin-audit-log',
              component: () => import('../views/admin/AuditLogView.vue'),
            },
          ],
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (auth.loading) {
    await auth.checkSession();
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login' };
  }

  if (to.meta.guest && auth.isLoggedIn) {
    return { name: 'home' };
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'home' };
  }
});
