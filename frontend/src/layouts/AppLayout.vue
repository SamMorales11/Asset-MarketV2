<script setup lang="ts">
import Navbar from '../components/Navbar.vue';
import Footer from '../components/Footer.vue';
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-background text-text-primary font-sans antialiased selection:bg-primary selection:text-white">
    <!-- Ambient subtle background glow accents -->
    <div class="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
      <div class="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl"></div>
      <div class="absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-secondary/15 blur-3xl"></div>
    </div>

    <!-- Navigation Bar -->
    <Navbar />

    <!-- Main Dynamic Content -->
    <main class="relative z-10 flex-1">
      <slot />
    </main>

    <!-- Global Footer -->
    <Footer />
  </div>
</template>
