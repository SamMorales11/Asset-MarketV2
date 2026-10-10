<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Coins,
  ShieldAlert,
  UserCog,
  Activity,
} from 'lucide-vue-next';

const route = useRoute();
const authStore = useAuthStore();

const adminTabs = computed(() => {
  const tabs = [
    {
      name: 'Admin Overview',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Moderation Queue',
      path: '/admin/approvals',
      icon: ShieldCheck,
    },
    {
      name: 'Manage Users',
      path: '/admin/users',
      icon: Users,
    },
    {
      name: 'User Revenue (60/40)',
      path: '/admin/revenue',
      icon: Coins,
    },
    {
      name: 'Audit Trail',
      path: '/admin/audit',
      icon: Activity,
    },
  ];

  if (authStore.isSuperAdmin) {
    tabs.push({
      name: 'Manage Admins',
      path: '/admin/admins',
      icon: UserCog,
    });
  }

  return tabs;
});

function isActive(path: string) {
  return route.path === path || (path === '/admin/dashboard' && route.path === '/admin');
}
</script>

<template>
  <div class="mb-8 border-b border-border bg-elevated/40 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-xl">
    <!-- Top Identity Row -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-border/60">
      <div class="flex items-center gap-3.5">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 border border-primary/40 text-primary shadow-lg">
          <ShieldAlert class="h-6 w-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-heading text-2xl font-bold tracking-tight text-text-primary">
              Admin Control Center
            </h2>
            <span class="rounded-full bg-primary/15 border border-primary/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {{ authStore.isSuperAdmin ? 'Superadmin Privileges' : 'Admin Operations' }}
            </span>
          </div>
          <p class="text-xs text-text-secondary mt-0.5">
            Manajemen operasional marketplace, verifikasi pembayaran escrow, pengguna, dan bagi hasil 60/40.
          </p>
        </div>
      </div>

      <!-- Quick Back to Marketplace -->
      <router-link
        to="/dashboard"
        class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-secondary transition shadow"
      >
        <span>Area User Saya</span>
      </router-link>
    </div>

    <!-- Navigation Tabs -->
    <div class="mt-4 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none pt-1 -mx-1 px-1">
      <router-link
        v-for="tab in adminTabs"
        :key="tab.path"
        :to="tab.path"
        class="inline-flex items-center gap-2 rounded-xl px-3.5 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97]"
        :class="
          isActive(tab.path)
            ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
            : 'text-text-secondary hover:text-text-primary hover:bg-elevated/80 border border-transparent hover:border-border/60'
        "
      >
        <component :is="tab.icon" class="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
        <span>{{ tab.name }}</span>
      </router-link>
    </div>
  </div>
</template>
