import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './auth.js';

export const useSocketStore = defineStore('socket', () => {
  const socket: Ref<Socket | null> = ref(null);
  const connected = ref(false);
  const connecting = ref(false);
  const listenerMap = new Map<string, Set<(...args: unknown[]) => void>>();

  function applyRegisteredListeners(targetSocket: Socket) {
    for (const [event, handlers] of listenerMap.entries()) {
      for (const handler of handlers) {
        targetSocket.on(event, handler);
      }
    }
  }

  async function connect() {
    if (socket.value?.connected || connecting.value) return;

    const auth = useAuthStore();
    if (!auth.user) return;
    connecting.value = true;

    let token: string | undefined;
    try {
      const tokenResult = await auth.createSocketToken();
      token = tokenResult.data?.token;
    } catch {
      connecting.value = false;
      return;
    }

    if (!token) {
      connecting.value = false;
      return;
    }

    socket.value = io(window.location.origin, {
      path: '/ws/',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    applyRegisteredListeners(socket.value);

    socket.value.on('connect', () => {
      connected.value = true;
      connecting.value = false;
      socket.value?.emit('auth', { token });
    });

    socket.value.on('disconnect', () => {
      connected.value = false;
      connecting.value = false;
    });

    socket.value.on('auth:error', () => {
      connected.value = false;
      connecting.value = false;
      socket.value?.disconnect();
    });
  }

  function disconnect() {
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
    connecting.value = false;
  }

  function emit(event: string, data?: unknown) {
    socket.value?.emit(event, data);
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    const handlers = listenerMap.get(event) ?? new Set<(...args: unknown[]) => void>();
    handlers.add(handler);
    listenerMap.set(event, handlers);
    socket.value?.on(event, handler);
  }

  function off(event: string, handler?: (...args: unknown[]) => void) {
    if (handler) {
      listenerMap.get(event)?.delete(handler);
      if (listenerMap.get(event)?.size === 0) {
        listenerMap.delete(event);
      }
    } else {
      listenerMap.delete(event);
    }
    socket.value?.off(event, handler);
  }

  return { socket, connected, connecting, connect, disconnect, emit, on, off };
});
