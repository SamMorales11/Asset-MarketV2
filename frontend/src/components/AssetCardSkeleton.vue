<template>
  <div class="flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-elevated-card">
    <!-- Thumbnail Skeleton (4:3 ratio to match card) -->
    <div class="aspect-[4/3] w-full skeleton-shimmer"></div>

    <!-- Body Skeleton -->
    <div class="flex flex-1 flex-col px-5 pt-4 pb-5 space-y-3">
      <!-- Seller + Rating row -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="h-[18px] w-[18px] rounded-full skeleton-shimmer"></div>
          <div class="h-3 w-24 skeleton-shimmer rounded"></div>
        </div>
        <div class="h-3 w-14 skeleton-shimmer rounded"></div>
      </div>

      <!-- Title -->
      <div class="space-y-1.5">
        <div class="h-5 w-[85%] skeleton-shimmer rounded-md"></div>
        <div class="h-5 w-[55%] skeleton-shimmer rounded-md"></div>
      </div>

      <!-- Description lines -->
      <div class="space-y-1.5 pt-0.5">
        <div class="h-3 w-full skeleton-shimmer rounded"></div>
        <div class="h-3 w-3/4 skeleton-shimmer rounded"></div>
      </div>

      <!-- Tags -->
      <div class="flex gap-1.5 pt-0.5">
        <div class="h-[18px] w-12 skeleton-shimmer rounded"></div>
        <div class="h-[18px] w-16 skeleton-shimmer rounded"></div>
        <div class="h-[18px] w-10 skeleton-shimmer rounded"></div>
      </div>

      <!-- Price & Button footer -->
      <div class="flex items-end justify-between border-t border-border/30 pt-4 mt-auto">
        <div class="space-y-1.5">
          <div class="h-2 w-8 skeleton-shimmer rounded"></div>
          <div class="h-5 w-24 skeleton-shimmer rounded"></div>
        </div>
        <div class="h-10 w-20 skeleton-shimmer rounded-xl"></div>
      </div>
    </div>
  </div>
</template>
