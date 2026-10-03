<template>
  <div class="flex flex-col overflow-hidden rounded-2xl border border-border bg-elevated/50 animate-pulse">
    <!-- Thumbnail Skeleton -->
    <div class="aspect-video w-full bg-elevated-subtle/80"></div>

    <!-- Body Skeleton -->
    <div class="flex flex-1 flex-col p-5 space-y-3">
      <!-- Seller and Rating line -->
      <div class="flex items-center justify-between">
        <div class="h-3 w-24 bg-border/60 rounded"></div>
        <div class="h-3 w-12 bg-border/60 rounded"></div>
      </div>

      <!-- Title line -->
      <div class="h-5 w-4/5 bg-border/70 rounded"></div>

      <!-- Description lines -->
      <div class="space-y-1.5 pt-1">
        <div class="h-2.5 w-full bg-border/50 rounded"></div>
        <div class="h-2.5 w-3/4 bg-border/50 rounded"></div>
      </div>

      <!-- Tag chips -->
      <div class="flex gap-1.5 pt-2">
        <div class="h-4 w-12 bg-border/40 rounded"></div>
        <div class="h-4 w-16 bg-border/40 rounded"></div>
        <div class="h-4 w-10 bg-border/40 rounded"></div>
      </div>

      <!-- Price & Button footer -->
      <div class="flex items-center justify-between border-t border-border pt-4 mt-auto">
        <div class="space-y-1">
          <div class="h-2 w-8 bg-border/40 rounded"></div>
          <div class="h-4 w-20 bg-border/70 rounded"></div>
        </div>
        <div class="h-8 w-20 bg-border/70 rounded-xl"></div>
      </div>
    </div>
  </div>
</template>
