import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './auth.js';

export const useSocketStore = defineStore('socket', () => {
  const socket: Ref<Socket | null> = ref(null);
  const connected = ref(false);

  function connect() {
    if (socket.value?.connected) return;

    const auth = useAuthStore();
    if (!auth.user) return;

    socket.value = io(window.location.origin, {
      path: '/ws/',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.value.on('connect', () => {
      connected.value = true;
      socket.value?.emit('auth', {
        userId: auth.user!.id,
        username: auth.user!.username,
      });
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
    });
  }

  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
  }

  function emit(event: string, data?: unknown) {
    socket.value?.emit(event, data);
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    socket.value?.on(event, handler);
  }

  function off(event: string, handler?: (...args: unknown[]) => void) {
    socket.value?.off(event, handler);
  }

  return { socket, connected, connect, disconnect, emit, on, off };
});
