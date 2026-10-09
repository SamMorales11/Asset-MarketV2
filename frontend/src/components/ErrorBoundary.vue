<script setup lang="ts">
import { ref, watch, onErrorCaptured } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const isDev = import.meta.env.DEV;
const hasError = ref(false);
const errorMessage = ref('');
const errorInfo = ref('');

// Auto-reset error state when navigating to another route
watch(
  () => route.fullPath,
  () => {
    if (hasError.value) {
      hasError.value = false;
      errorMessage.value = '';
      errorInfo.value = '';
    }
  }
);

const handleError = (err: Error, instance: any, info: string) => {
  console.error('[ErrorBoundary] Caught error:', err);
  console.error('[ErrorBoundary] Component:', instance);
  console.error('[ErrorBoundary] Info:', info);

  hasError.value = true;
  errorMessage.value = err.message || 'Terjadi kesalahan yang tidak terduga';
  errorInfo.value = info;

  return false; // Prevent error from propagating further
};

onErrorCaptured(handleError);

const handleRetry = () => {
  hasError.value = false;
  errorMessage.value = '';
  errorInfo.value = '';
};

const handleGoHome = () => {
  hasError.value = false;
  errorMessage.value = '';
  errorInfo.value = '';
  router.push('/');
};
</script>

<template>
  <div v-if="hasError" class="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4">
    <div class="max-w-md w-full bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-8 text-center">
      <!-- Error Icon -->
      <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <!-- Error Title -->
      <h2 class="font-heading text-xl font-bold text-text-primary mb-2">Oops! Terjadi Kesalahan</h2>

      <!-- Error Message -->
      <p class="text-[#888] mb-4">{{ errorMessage }}</p>

      <!-- Error Info (dev only) -->
      <div v-if="errorInfo && isDev" class="text-xs text-[#666] mb-6 p-3 bg-[#0F0F0F] rounded-lg text-left overflow-auto max-h-32">
        <code>{{ errorInfo }}</code>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button
          @click="handleRetry"
          class="flex-1 px-4 py-2.5 bg-[#D93A0F] hover:bg-[#B82E0C] text-white rounded-lg font-medium transition-colors"
        >
          Coba Lagi
        </button>
        <button
          @click="handleGoHome"
          class="flex-1 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white rounded-lg font-medium transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  </div>

  <template v-else>
    <slot />
  </template>
</template>
