<script setup lang="ts">
import AppLayout from './layouts/AppLayout.vue';
import ToastContainer from './components/ToastContainer.vue';
import ConfirmationModal from './components/ConfirmationModal.vue';
import ErrorBoundary from './components/ErrorBoundary.vue';
</script>

<template>
  <AppLayout>
    <ErrorBoundary>
      <router-view />
    </ErrorBoundary>
  </AppLayout>
  <ToastContainer />
  <ConfirmationModal />
</template>
