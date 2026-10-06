<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue';
import { useConfirm, type ConfirmVariant } from '../composables/useConfirm';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  AlertOctagon,
  Info,
  Loader2,
  X,
} from 'lucide-vue-next';

interface Props {
  isOpen?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: undefined,
  title: undefined,
  message: undefined,
  confirmText: undefined,
  cancelText: undefined,
  variant: undefined,
  isLoading: undefined,
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'close'): void;
}>();

const { state, handleConfirm, handleCancel } = useConfirm();

// Support both standalone props and global composable state
const activeIsOpen = computed(() =>
  props.isOpen !== undefined ? props.isOpen : state.value.isOpen
);
const activeTitle = computed(() =>
  props.title !== undefined ? props.title : state.value.title
);
const activeMessage = computed(() =>
  props.message !== undefined ? props.message : state.value.message
);
const activeConfirmText = computed(() =>
  props.confirmText !== undefined ? props.confirmText : state.value.confirmText || 'Konfirmasi'
);
const activeCancelText = computed(() =>
  props.cancelText !== undefined ? props.cancelText : state.value.cancelText || 'Batal'
);
const activeVariant = computed<ConfirmVariant>(() =>
  props.variant !== undefined ? props.variant : state.value.variant || 'primary'
);
const activeIsLoading = computed(() =>
  props.isLoading !== undefined ? props.isLoading : state.value.isLoading
);

// Prevent background scrolling when modal is open
watch(
  activeIsOpen,
  (open) => {
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  },
  { immediate: true }
);

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && activeIsOpen.value && !activeIsLoading.value) {
    onCancel();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
  }
});

function onConfirm() {
  if (props.isOpen !== undefined) {
    emit('confirm');
  } else {
    handleConfirm();
  }
}

function onCancel() {
  if (props.isOpen !== undefined) {
    emit('cancel');
    emit('close');
  } else {
    handleCancel();
  }
}

// Variant styling helpers
const variantConfig = computed(() => {
  switch (activeVariant.value) {
    case 'danger':
      return {
        badgeBg: 'bg-red-500/15 text-red-400 border border-red-500/30',
        confirmBtn:
          'bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 focus:ring-red-500',
        icon: AlertTriangle,
      };
    case 'success':
      return {
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        confirmBtn:
          'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 focus:ring-emerald-500',
        icon: CheckCircle2,
      };
    case 'warning':
      return {
        badgeBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        confirmBtn:
          'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/25 hover:bg-amber-400 focus:ring-amber-500',
        icon: AlertOctagon,
      };
    case 'info':
      return {
        badgeBg: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
        confirmBtn:
          'bg-sky-500 text-white shadow-lg shadow-sky-500/25 hover:bg-sky-600 focus:ring-sky-500',
        icon: Info,
      };
    case 'primary':
    default:
      return {
        badgeBg: 'bg-primary/15 text-primary border border-primary/30',
        confirmBtn:
          'bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-hover focus:ring-primary',
        icon: Sparkles,
      };
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeIsOpen"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        @click.self="!activeIsLoading && onCancel()"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
        >
          <div
            v-if="activeIsOpen"
            class="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-elevated/95 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5"
          >
            <!-- Header with Icon & Close -->
            <div class="flex items-start justify-between gap-4">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner shrink-0"
                :class="variantConfig.badgeBg"
              >
                <component :is="variantConfig.icon" class="h-6 w-6" />
              </div>

              <button
                v-if="!activeIsLoading"
                type="button"
                class="rounded-xl border border-border/50 bg-background/50 p-2 text-text-muted hover:text-text-primary hover:border-border transition"
                aria-label="Tutup dialog"
                @click="onCancel"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <!-- Title & Description -->
            <div class="space-y-2">
              <h3
                id="confirm-modal-title"
                class="font-heading text-xl sm:text-2xl font-bold text-text-primary leading-tight"
              >
                {{ activeTitle }}
              </h3>

              <p
                id="confirm-modal-description"
                class="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line"
              >
                {{ activeMessage }}
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                :disabled="activeIsLoading"
                class="w-full sm:w-auto rounded-xl border border-border bg-elevated px-5 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-elevated-subtle hover:border-border-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
                @click="onCancel"
              >
                {{ activeCancelText }}
              </button>

              <button
                type="button"
                id="confirm-modal-submit-btn"
                :disabled="activeIsLoading"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background"
                :class="variantConfig.confirmBtn"
                @click="onConfirm"
              >
                <Loader2 v-if="activeIsLoading" class="h-4 w-4 animate-spin" />
                <span>{{ activeConfirmText }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
