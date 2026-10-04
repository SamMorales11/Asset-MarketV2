<template>
  <div class="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-elevated-card">
    <!-- Thumbnail Skeleton -->
    <div class="aspect-[16/10] w-full skeleton-shimmer"></div>

    <!-- Body Skeleton -->
    <div class="flex flex-1 flex-col p-5 space-y-3">
      <!-- Seller and Rating line -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-5 w-5 rounded-full skeleton-shimmer"></div>
          <div class="h-3 w-24 skeleton-shimmer rounded"></div>
        </div>
        <div class="h-3 w-14 skeleton-shimmer rounded"></div>
      </div>

      <!-- Title line -->
      <div class="h-6 w-4/5 skeleton-shimmer rounded-md"></div>

      <!-- Description lines -->
      <div class="space-y-2 pt-1">
        <div class="h-3 w-full skeleton-shimmer rounded"></div>
        <div class="h-3 w-3/4 skeleton-shimmer rounded"></div>
      </div>

      <!-- Tag chips -->
      <div class="flex gap-2 pt-1">
        <div class="h-5 w-14 skeleton-shimmer rounded-md"></div>
        <div class="h-5 w-18 skeleton-shimmer rounded-md"></div>
        <div class="h-5 w-12 skeleton-shimmer rounded-md"></div>
      </div>

      <!-- Price & Button footer -->
      <div class="flex items-center justify-between border-t border-border/30 pt-4 mt-auto">
        <div class="space-y-1.5">
          <div class="h-2 w-8 skeleton-shimmer rounded"></div>
          <div class="h-5 w-24 skeleton-shimmer rounded"></div>
        </div>
        <div class="h-9 w-20 skeleton-shimmer rounded-xl"></div>
      </div>
    </div>
  </div>
</template>
