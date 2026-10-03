<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next';
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
    <span class="font-heading text-8xl font-bold text-primary">404</span>
    <h1 class="mt-4 font-heading text-3xl font-bold text-text-primary">Asset Not Found</h1>
    <p class="mt-2 text-sm text-text-secondary">The page or asset you are looking for has been moved or does not exist.</p>
    <router-link
      to="/"
      class="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover transition"
    >
      <ArrowLeft class="h-4 w-4" />
      <span>Back to Home</span>
    </router-link>
  </div>
</template>
