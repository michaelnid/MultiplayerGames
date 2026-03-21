<template>
  <div class="home">
    <section class="hero">
      <span class="hero-pre">MIKE</span>
      <h1 class="hero-title">Game Library</h1>
      <p class="hero-sub">Dein digitaler Spieleabend -- wuerfle, spiele und gewinne</p>
    </section>

    <section class="games-section">
      <h2 class="section-title">Verfuegbare Spiele</h2>

      <div v-if="loading" class="loading-state">Spiele werden geladen...</div>

      <div v-else-if="plugins.length === 0" class="empty-state">
        <p>Noch keine Spiele installiert.</p>
        <p class="text-muted">Spiele werden als Plugins im Admin-Bereich hinzugefuegt.</p>
      </div>

      <div v-else class="game-grid">
        <div
          v-for="(plugin, i) in plugins"
          :key="plugin.id"
          class="game-card"
          :style="{ '--accent': colors[i % colors.length] }"
        >
          <div class="game-card-icon">
            <img
              v-if="plugin.manifest?.icon"
              :src="`/plugins/${plugin.slug}/${plugin.manifest.icon}`"
              :alt="plugin.name"
              class="game-card-img"
            />
            <span v-else class="game-card-letter">{{ plugin.name.charAt(0) }}</span>
          </div>
          <h3>{{ plugin.name }}</h3>
          <p class="game-desc">{{ plugin.manifest?.description || '' }}</p>
          <div class="game-meta">
            {{ playerRange(plugin) }} Spieler
          </div>
        </div>
      </div>
    </section>

    <section class="actions-section">
      <RouterLink v-if="!auth.isLoggedIn" to="/login" class="action-btn primary">
        Anmelden und losspielen
      </RouterLink>
      <RouterLink v-else to="/multiplayer" class="action-btn primary">
        Lobby erstellen
      </RouterLink>
      <RouterLink to="/bibliothek" class="action-btn secondary">
        Alle Spiele ansehen
      </RouterLink>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../api/client.js';
import type { Plugin } from '@mike-games/shared';

const auth = useAuthStore();
const plugins = ref<Plugin[]>([]);
const loading = ref(true);

const colors = [
  '#f59e0b', '#6366f1', '#22c55e', '#ef4444', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

function effectiveMinPlayers(plugin: Plugin): number {
  const configured = plugin.effectiveMinPlayers;
  if (Number.isFinite(configured) && Number(configured) >= 1) {
    return Math.floor(Number(configured));
  }
  const manifestMin = plugin.manifest?.minPlayers;
  if (Number.isFinite(manifestMin) && Number(manifestMin) >= 1) {
    return Math.floor(Number(manifestMin));
  }
  return 1;
}

function playerRange(plugin: Plugin): string {
  const min = effectiveMinPlayers(plugin);
  const configuredMax = plugin.effectiveMaxPlayers;
  if (Number.isFinite(configuredMax) && Number(configuredMax) >= min) {
    return `${min}–${Math.floor(Number(configuredMax))}`;
  }
  const manifestMax = plugin.manifest?.maxPlayers;
  if (Number.isFinite(manifestMax) && Number(manifestMax) >= min) {
    return `${min}–${Math.floor(Number(manifestMax))}`;
  }
  return `${min}–${min}`;
}

onMounted(async () => {
  try {
    const result = await api.get<Plugin[]>('/plugins/active');
    plugins.value = result.data ?? [];
  } catch {
    // Noch keine Plugins
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.home {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.hero {
  text-align: center;
  padding: 4rem 0 3rem;
}

.hero-pre {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 6px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  background: linear-gradient(135deg, var(--color-primary), #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1rem;
}

.hero-sub {
  font-size: 1.05rem;
  color: var(--color-text-muted);
  max-width: 500px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.game-card {
  background-color: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem 1rem;
  text-align: center;
  cursor: default;
  transition: border-color var(--transition), transform var(--transition), box-shadow var(--transition);
  position: relative;
  overflow: hidden;
}

.game-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent, var(--color-primary));
  opacity: 0;
  transition: opacity var(--transition);
}

.game-card:hover {
  border-color: var(--accent, var(--color-primary));
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.game-card:hover::before {
  opacity: 1;
}

.game-card-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent, var(--color-primary)), rgba(255,255,255,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 0.85rem;
}

.game-card-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.game-card-letter {
  color: white;
  font-size: 1.3rem;
  font-weight: 700;
}

.game-card h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.game-desc {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-meta {
  margin-top: 0.6rem;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.actions-section {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 3rem 0 4rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.5rem;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition);
}

.action-btn.primary {
  background-color: var(--color-primary);
  color: white;
}

.action-btn.primary:hover {
  background-color: var(--color-primary-hover);
  color: white;
}

.action-btn.secondary {
  background-color: var(--color-bg-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.action-btn.secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.2rem;
  }

  .hero {
    padding: 2.5rem 0 2rem;
  }

  .actions-section {
    flex-direction: column;
    align-items: center;
  }
}
</style>
