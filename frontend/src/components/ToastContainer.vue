<script setup lang="ts">
import { useToast, type ToastType } from '../composables/useToast';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-vue-next';

const { toasts, removeToast } = useToast();

function getToastStyle(type: ToastType) {
  switch (type) {
    case 'success':
      return {
        borderClass: 'border-success/40 bg-elevated/95 shadow-success/10',
        badgeBg: 'bg-success/15 text-success',
        icon: CheckCircle2,
        titleColor: 'text-text-primary',
        accentColor: 'bg-success',
      };
    case 'error':
      return {
        borderClass: 'border-primary/50 bg-elevated/95 shadow-primary/10',
        badgeBg: 'bg-primary/15 text-primary',
        icon: XCircle,
        titleColor: 'text-text-primary',
        accentColor: 'bg-primary',
      };
    case 'warning':
      return {
        borderClass: 'border-amber-500/50 bg-elevated/95 shadow-amber-500/10',
        badgeBg: 'bg-amber-500/15 text-amber-500',
        icon: AlertTriangle,
        titleColor: 'text-text-primary',
        accentColor: 'bg-amber-500',
      };
    case 'info':
    default:
      return {
        borderClass: 'border-secondary/40 bg-elevated/95 shadow-secondary/10',
        badgeBg: 'bg-secondary/15 text-secondary',
        icon: Info,
        titleColor: 'text-text-primary',
        accentColor: 'bg-secondary',
      };
  }
}
</script>

<template>
  <div
    class="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="item in toasts"
        :key="item.id"
        class="pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all"
        :class="getToastStyle(item.type).borderClass"
      >
        <!-- Accent line indicator -->
        <div
          class="absolute top-0 left-0 bottom-0 w-1.5"
          :class="getToastStyle(item.type).accentColor"
        />

        <div class="flex items-start gap-3 pl-1.5">
          <!-- Icon Badge -->
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            :class="getToastStyle(item.type).badgeBg"
          >
            <component :is="getToastStyle(item.type).icon" class="h-4 w-4" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 pt-0.5">
            <h4
              class="font-heading text-sm font-bold leading-tight"
              :class="getToastStyle(item.type).titleColor"
            >
              {{ item.title }}
            </h4>
            <p
              v-if="item.message"
              class="mt-1 text-xs text-text-secondary leading-relaxed break-words"
            >
              {{ item.message }}
            </p>
          </div>

          <!-- Close Button -->
          <button
            class="text-text-muted hover:text-text-primary transition p-1 rounded-lg hover:bg-border/30 shrink-0"
            @click="removeToast(item.id)"
            title="Tutup Notifikasi"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
