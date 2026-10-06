<script setup lang="ts">
import AppLayout from './layouts/AppLayout.vue';
import ToastContainer from './components/ToastContainer.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
</script>

<template>
  <AppLayout>
    <router-view />
  </AppLayout>
  <ToastContainer />
  <ConfirmationModal />
</template>
