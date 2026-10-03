<script setup lang="ts">
import AppLayout from './layouts/AppLayout.vue';
import ToastContainer from './components/ToastContainer.vue';
</script>

<template>
  <AppLayout>
    <router-view />
  </AppLayout>
  <ToastContainer />
</template>
