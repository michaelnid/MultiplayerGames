import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client.js';
import type { ApiResponse, User } from '@mike-games/shared';

interface LoginResponseData {
  requiresTOTP?: boolean;
  id?: string;
  username?: string;
  role?: User['role'];
  totpEnabled?: boolean;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(true);

  const isLoggedIn = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isGameMaster = computed(() => user.value?.role === 'gamemaster' || user.value?.role === 'admin');

  async function checkSession() {
    try {
      loading.value = true;
      const result = await api.get<User>('/auth/me');
      user.value = result.data ?? null;
    } catch {
      user.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function login(username: string, password: string, totpCode?: string) {
    const result = await api.post<LoginResponseData>('/auth/login', { username, password, totpCode });
    if (result.data?.requiresTOTP) {
      user.value = null;
      return result;
    }
    await checkSession();
    return result;
  }

  async function createSocketToken(): Promise<ApiResponse<{ token: string; userId: string; username: string }>> {
    return api.get<{ token: string; userId: string; username: string }>('/auth/socket-token');
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Session war bereits abgelaufen
    }
    user.value = null;
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    return api.put('/auth/password', { currentPassword, newPassword });
  }

  return {
    user,
    loading,
    isLoggedIn,
    isAdmin,
    isGameMaster,
    checkSession,
    login,
    createSocketToken,
    logout,
    changePassword,
  };
});
