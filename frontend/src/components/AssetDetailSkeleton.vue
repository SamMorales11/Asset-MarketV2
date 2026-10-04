<script setup lang="ts">
import Skeleton from './Skeleton.vue';
</script>

<template>
  <div class="mx-auto max-w-[1400px] px-6 lg:px-10 py-8 space-y-8 animate-fade-in-up">
    <!-- Breadcrumb Skeleton -->
    <div class="flex items-center gap-2">
      <Skeleton variant="text" width="w-14" height="h-3.5" rounded="rounded" />
      <span class="text-text-muted opacity-40">/</span>
      <Skeleton variant="text" width="w-20" height="h-3.5" rounded="rounded" />
      <span class="text-text-muted opacity-40">/</span>
      <Skeleton variant="text" width="w-48" height="h-3.5" rounded="rounded" />
    </div>

    <!-- Hero Header Skeleton -->
    <div class="space-y-4 max-w-4xl">
      <div class="flex items-center gap-3">
        <Skeleton variant="badge" width="w-24" height="h-6" rounded="rounded-full" />
        <Skeleton variant="badge" width="w-32" height="h-6" rounded="rounded-full" />
      </div>
      <Skeleton variant="title" width="w-4/5" height="h-12" rounded="rounded-xl" />
      <div class="flex items-center gap-4 pt-1">
        <div class="flex items-center gap-2">
          <Skeleton variant="avatar" width="w-6" height="h-6" />
          <Skeleton variant="text" width="w-32" height="h-3.5" rounded="rounded" />
        </div>
        <span class="text-text-muted opacity-40">•</span>
        <Skeleton variant="text" width="w-24" height="h-3.5" rounded="rounded" />
        <span class="text-text-muted opacity-40">•</span>
        <Skeleton variant="text" width="w-28" height="h-3.5" rounded="rounded" />
      </div>
    </div>

    <!-- Editorial 2-Column Grid Skeleton -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
      <!-- Main Content (8 Cols) -->
      <div class="lg:col-span-8 space-y-8">
        <!-- Main Media Frame -->
        <div class="aspect-video w-full rounded-3xl skeleton-shimmer overflow-hidden border border-border/40"></div>

        <!-- Tabs placeholder -->
        <div class="flex items-center gap-4 border-b border-border/30 pb-3">
          <Skeleton variant="button" width="w-28" height="h-8" rounded="rounded-lg" />
          <Skeleton variant="button" width="w-24" height="h-8" rounded="rounded-lg" />
          <Skeleton variant="button" width="w-28" height="h-8" rounded="rounded-lg" />
        </div>

        <!-- Description Paragraphs -->
        <div class="space-y-3 pt-2">
          <Skeleton variant="text" width="w-full" height="h-4" rounded="rounded" />
          <Skeleton variant="text" width="w-11/12" height="h-4" rounded="rounded" />
          <Skeleton variant="text" width="w-4/5" height="h-4" rounded="rounded" />
          <div class="pt-2"></div>
          <Skeleton variant="text" width="w-full" height="h-4" rounded="rounded" />
          <Skeleton variant="text" width="w-3/4" height="h-4" rounded="rounded" />
        </div>

        <!-- Features list skeleton -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div v-for="n in 4" :key="n" class="rounded-2xl border border-border/30 bg-elevated/40 p-4 space-y-2">
            <div class="flex items-center gap-3">
              <Skeleton variant="avatar" width="w-8" height="h-8" rounded="rounded-xl" />
              <div class="space-y-1.5 flex-1">
                <Skeleton variant="text" width="w-24" height="h-3.5" rounded="rounded" />
                <Skeleton variant="text" width="w-36" height="h-2.5" rounded="rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticky Sidebar (4 Cols) -->
      <div class="lg:col-span-4 space-y-6">
        <!-- Pricing Action Card -->
        <div class="rounded-3xl border border-border/50 bg-elevated/80 p-6 backdrop-blur-md space-y-6">
          <div class="space-y-2">
            <Skeleton variant="text" width="w-16" height="h-3" rounded="rounded" />
            <Skeleton variant="title" width="w-44" height="h-10" rounded="rounded-lg" />
          </div>

          <div class="space-y-3 pt-2">
            <Skeleton variant="button" width="w-full" height="h-12" rounded="rounded-xl" />
            <Skeleton variant="button" width="w-full" height="h-11" rounded="rounded-xl" />
          </div>

          <div class="pt-4 border-t border-border/30 space-y-2.5">
            <div v-for="i in 3" :key="i" class="flex items-center gap-2.5">
              <Skeleton variant="avatar" width="w-4" height="h-4" rounded="rounded-full" />
              <Skeleton variant="text" width="w-48" height="h-3" rounded="rounded" />
            </div>
          </div>
        </div>

        <!-- Specs Card -->
        <div class="rounded-3xl border border-border/50 bg-elevated/60 p-6 backdrop-blur-md space-y-4">
          <Skeleton variant="title" width="w-32" height="h-5" rounded="rounded" />
          <div class="space-y-3 pt-2">
            <div v-for="i in 5" :key="i" class="flex items-center justify-between py-1 border-b border-border/20">
              <Skeleton variant="text" width="w-20" height="h-3" rounded="rounded" />
              <Skeleton variant="text" width="w-28" height="h-3" rounded="rounded" />
            </div>
          </div>
        </div>

        <!-- Seller Mini Card -->
        <div class="rounded-3xl border border-border/50 bg-elevated/60 p-5 backdrop-blur-md flex items-center gap-4">
          <Skeleton variant="avatar" width="w-12" height="h-12" rounded="rounded-2xl" />
          <div class="space-y-1.5 flex-1">
            <Skeleton variant="text" width="w-28" height="h-4" rounded="rounded" />
            <Skeleton variant="text" width="w-40" height="h-3" rounded="rounded" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
