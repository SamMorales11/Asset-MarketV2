<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next';
</script>

<template>
  <footer class="mt-auto border-t border-border/50 bg-background text-text-secondary">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <!-- Upper Row: Brand & Minimalist Navigation -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-border/40">
        <!-- Brand & Brief Tagline -->
        <div class="space-y-2 max-w-sm">
          <router-link to="/" class="inline-flex items-center gap-2.5 group">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/20 group-hover:bg-primary-hover transition duration-200">
              <Sparkles class="h-4 w-4" />
            </div>
            <span class="font-heading text-2xl font-bold tracking-tight text-text-primary">
              Asset<span class="text-primary italic ml-1">Market</span>
            </span>
          </router-link>
          <p class="text-xs text-text-secondary leading-relaxed font-normal">
            Curated digital marketplace for visionaries. Premium templates, 3D assets, and clean codebases with 60% creator revenue share.
          </p>
        </div>

        <!-- Streamlined Navigation (Essential 5 Links) -->
        <nav class="flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-medium text-text-secondary">
          <router-link to="/explore" class="hover:text-text-primary transition duration-150">
            Catalog
          </router-link>
          <router-link to="/panduan" class="hover:text-text-primary transition duration-150">
            Panduan
          </router-link>
          <router-link to="/panduan?tab=registrasi" class="hover:text-text-primary transition duration-150">
            Tentang
          </router-link>
          <router-link to="/panduan?tab=kelola" class="hover:text-text-primary transition duration-150">
            Bantuan
          </router-link>
          <router-link to="/panduan?tab=jual" class="hover:text-text-primary transition duration-150">
            Syarat &amp; Ketentuan
          </router-link>
        </nav>
      </div>

      <!-- Lower Row: Copyright & Luxury Artisan Mark -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[11px] text-text-muted">
        <p>&copy; 2026 Asset Market Inc. All rights reserved.</p>
        <p class="font-normal tracking-wide text-text-secondary/70">
          Engineered for creators &amp; developers
        </p>
      </div>
    </div>
  </footer>
</template>
