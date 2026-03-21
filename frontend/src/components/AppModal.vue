<template>
  <Teleport to="body">
    <div v-if="modelValue" class="app-modal-overlay" @click="onOverlayClick">
      <div
        class="app-modal card"
        :class="`app-modal--${size}`"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <div class="app-modal__header">
          <h3 class="app-modal__title">{{ title }}</h3>
          <button type="button" class="app-modal__close" :disabled="busy" @click="close">
            Schließen
          </button>
        </div>

        <div class="app-modal__content">
          <slot>
            <p v-if="message" class="app-modal__message">{{ message }}</p>
          </slot>
        </div>

        <div class="app-modal__actions">
          <button type="button" class="btn-secondary" :disabled="busy" @click="cancel">
            {{ cancelText }}
          </button>
          <button type="button" :class="confirmButtonClass" :disabled="busy" @click="confirm">
            {{ busy ? busyText : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
type ConfirmVariant = 'primary' | 'danger';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  busyText?: string;
  size?: ModalSize;
  confirmVariant?: ConfirmVariant;
  closeOnOverlay?: boolean;
  busy?: boolean;
}>(), {
  message: '',
  confirmText: 'Bestätigen',
  cancelText: 'Abbrechen',
  busyText: 'Bitte warten...',
  size: 'md',
  confirmVariant: 'primary',
  closeOnOverlay: true,
  busy: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const confirmButtonClass = computed(() => {
  return props.confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary';
});

function close() {
  if (props.busy) return;
  emit('update:modelValue', false);
}

function cancel() {
  if (props.busy) return;
  emit('cancel');
  emit('update:modelValue', false);
}

function confirm() {
  emit('confirm');
}

function onOverlayClick() {
  if (!props.closeOnOverlay || props.busy) return;
  cancel();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue && !props.busy) {
    cancel();
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    window.addEventListener('keydown', onKeydown);
  } else {
    window.removeEventListener('keydown', onKeydown);
  }
}, { immediate: true });

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.app-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background-color: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.app-modal {
  width: 100%;
  margin: 0;
  padding: 1rem;
}

.app-modal--sm { max-width: 420px; }
.app-modal--md { max-width: 560px; }
.app-modal--lg { max-width: 720px; }
.app-modal--xl { max-width: 920px; }

.app-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.app-modal__title {
  margin: 0;
  font-size: 1.05rem;
}

.app-modal__close {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  padding: 0.25rem 0.55rem;
}

.app-modal__close:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
}

.app-modal__content {
  margin-bottom: 1rem;
}

.app-modal__message {
  color: var(--color-text-muted);
  line-height: 1.5;
}

.app-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .app-modal__actions {
    flex-direction: column-reverse;
  }

  .app-modal__actions button {
    width: 100%;
  }
}
</style>
