<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  LayoutDashboard,
  FolderArchive,
  Layers,
  Receipt,
  Wallet,
  CreditCard,
  UserCheck,
  CheckCircle2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-vue-next';

const route = useRoute();
const authStore = useAuthStore();

const navigationTabs = computed(() => [
  {
    name: 'Overview',
    path: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'My Assets',
    path: '/purchases',
    icon: FolderArchive,
    badge: null,
  },
  {
    name: 'My Listings',
    path: '/listings',
    icon: Layers,
    badge: null,
  },
  {
    name: 'Transaksi',
    path: '/transactions',
    icon: Receipt,
    badge: null,
  },
  {
    name: 'Revenue 60/40',
    path: '/revenue',
    icon: Wallet,
    badge: null,
  },
  {
    name: 'Rekening Payout',
    path: '/settings/payment',
    icon: CreditCard,
    badge: !authStore.user?.bankAccountNumber ? 'Setup' : null,
  },
  {
    name: 'Edit Profile',
    path: '/settings/profile',
    icon: UserCheck,
    badge: null,
  },
]);

function isActive(path: string) {
  return route.path === path;
}
</script>

<template>
  <div class="mb-8 border-b border-border bg-elevated/40 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-xl">
    <!-- Top Identity Row -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border/60">
      <div class="flex items-center gap-4">
        <!-- Avatar Preview -->
        <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/30 to-elevated-subtle border border-primary/40 text-xl font-bold text-text-primary shadow-lg overflow-hidden">
          <img
            v-if="authStore.user?.avatarUrl"
            :src="authStore.user.avatarUrl"
            :alt="authStore.user?.name"
            class="h-full w-full object-cover"
          />
          <span v-else class="font-heading font-bold text-2xl text-primary">
            {{ authStore.user?.name?.charAt(0).toUpperCase() || 'U' }}
          </span>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-heading text-2xl font-bold tracking-tight text-text-primary">
              {{ authStore.user?.name }}
            </h2>
            <span
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              :class="
                authStore.isAdmin
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : authStore.isSeller
                  ? 'bg-secondary/15 text-secondary border border-secondary/30'
                  : 'bg-elevated-subtle text-text-secondary border border-border'
              "
            >
              <ShieldCheck v-if="authStore.isAdmin" class="h-3 w-3" />
              <CheckCircle2 v-else-if="authStore.isSeller" class="h-3 w-3" />
              <span>{{ authStore.isAdmin ? 'Platform Admin' : authStore.isSeller ? 'Verified Seller' : 'Registered Member' }}</span>
            </span>
          </div>
          <p class="text-xs text-text-secondary mt-0.5 font-mono">
            {{ authStore.user?.email }}
          </p>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2.5">
        <router-link
          to="/upload"
          class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition"
        >
          <UploadCloud class="h-4 w-4" />
          <span>Upload Aset Baru</span>
        </router-link>
      </div>
    </div>

    <!-- Navigation Tabs (Horizontally scrollable on mobile) -->
    <div class="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
      <router-link
        v-for="tab in navigationTabs"
        :key="tab.path"
        :to="tab.path"
        class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition"
        :class="
          isActive(tab.path)
            ? 'bg-primary text-white shadow-md'
            : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
        "
      >
        <component :is="tab.icon" class="h-3.5 w-3.5 shrink-0" />
        <span>{{ tab.name }}</span>
        <span
          v-if="tab.badge"
          class="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-bold"
        >
          {{ tab.badge }}
        </span>
      </router-link>
    </div>
  </div>
</template>
