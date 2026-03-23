import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const LS_MUTED = 'mike-sound-muted';
const LS_VOLUME = 'mike-sound-volume';

function loadBool(key: string, fallback: boolean): boolean {
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  return val === 'true';
}

function loadNumber(key: string, fallback: number): number {
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  const n = parseFloat(val);
  return isNaN(n) ? fallback : Math.max(0, Math.min(1, n));
}

export const useSoundStore = defineStore('sound', () => {
  const muted = ref(loadBool(LS_MUTED, false));
  const volume = ref(loadNumber(LS_VOLUME, 0.7));

  const isMuted = computed(() => muted.value);

  function toggle() {
    muted.value = !muted.value;
    localStorage.setItem(LS_MUTED, String(muted.value));
  }

  function setVolume(v: number) {
    volume.value = Math.max(0, Math.min(1, v));
    localStorage.setItem(LS_VOLUME, String(volume.value));
  }

  function play(src: string): Promise<void> {
    if (muted.value) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.volume = volume.value;
      audio.addEventListener('ended', () => resolve(), { once: true });
      audio.addEventListener('error', () => reject(new Error(`Sound konnte nicht geladen werden: ${src}`)), { once: true });
      audio.play().catch(() => {
        // Browser Autoplay-Policy: still ignorieren
        resolve();
      });
    });
  }

  return { muted, volume, isMuted, toggle, setVolume, play };
});
