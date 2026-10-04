<script setup lang="ts">
import Skeleton from './Skeleton.vue';
</script>

<template>
  <div class="rounded-3xl border border-border/50 bg-elevated/60 p-5 backdrop-blur-md space-y-3">
    <!-- Top row: label + icon placeholder -->
    <div class="flex items-center justify-between">
      <Skeleton variant="text" width="w-24" height="h-3" rounded="rounded" />
      <Skeleton variant="avatar" width="w-5" height="h-5" rounded="rounded-md" />
    </div>

    <!-- Big KPI Value -->
    <div class="pt-1">
      <Skeleton variant="title" width="w-36" height="h-8" rounded="rounded-lg" />
    </div>

    <!-- Subtitle / Meta footer -->
    <div class="pt-2 border-t border-border/30 flex items-center justify-between">
      <Skeleton variant="text" width="w-28" height="h-3" rounded="rounded" />
      <Skeleton variant="text" width="w-16" height="h-3" rounded="rounded" />
    </div>
  </div>
</template>
