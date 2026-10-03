<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import {
  ShoppingBag,
  Search,
  Sparkles,
  User,
  Menu,
  X,
  LogOut,
  UploadCloud,
  Layers,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  UserCheck,
  ChevronDown,
  FolderArchive,
  Receipt,
  Wallet,
  DollarSign,
  Users,
  LayoutDashboard,
} from 'lucide-vue-next';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();

const searchQuery = ref('');
const mobileMenuOpen = ref(false);
const isDropdownOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/explore', query: { q: searchQuery.value.trim() } });
  }
}

async function handleLogout() {
  isDropdownOpen.value = false;
  mobileMenuOpen.value = false;
  await authStore.logout();
  router.push('/login');
}

function handleOutsideClick(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick);
});

router.afterEach(() => {
  isDropdownOpen.value = false;
  mobileMenuOpen.value = false;
});
</script>

<template>
  <header class="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-colors">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- 1. LEFT: Brand Logo -->
      <div class="flex items-center">
        <router-link to="/" class="flex items-center gap-2.5 group">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/25 group-hover:bg-primary-hover transition duration-200">
            <Sparkles class="h-4.5 w-4.5" />
          </div>
          <span class="font-heading text-2xl font-bold tracking-tight text-text-primary">
            Asset<span class="text-primary italic ml-0.5">Market</span>
          </span>
        </router-link>
      </div>

      <!-- 2. CENTER: Clean & Essential Main Navigation (Always Visible) -->
      <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
        <router-link
          to="/"
          class="hover:text-text-primary transition duration-150 relative py-1"
          active-class="text-text-primary font-semibold"
        >
          Home
        </router-link>
        <router-link
          to="/explore"
          class="hover:text-text-primary transition duration-150 relative py-1"
          active-class="text-text-primary font-semibold"
        >
          Catalog
        </router-link>
        <router-link
          to="/panduan"
          class="hover:text-text-primary transition duration-150 relative py-1"
          active-class="text-text-primary font-semibold"
        >
          Panduan
        </router-link>
      </nav>

      <!-- 3. RIGHT: Search, Cart, Upload CTA, & Account Dropdown -->
      <div class="flex items-center gap-2.5 sm:gap-3.5">
        <!-- Compact Search Input -->
        <div class="relative hidden sm:block w-40 lg:w-52">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari aset..."
            class="w-full rounded-full border border-border bg-elevated/70 py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
            @keyup.enter="handleSearch"
          />
          <Search class="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-secondary" />
        </div>

        <!-- Cart Button -->
        <router-link
          to="/cart"
          class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-elevated/80 text-text-secondary hover:text-text-primary hover:border-border-hover transition"
          aria-label="Keranjang Belanja"
        >
          <ShoppingBag class="h-4 w-4" />
          <span
            v-if="cartStore.itemCount > 0"
            class="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-2 ring-background"
          >
            {{ cartStore.itemCount }}
          </span>
        </router-link>

        <!-- Standout Primary Upload Button (When Logged In) -->
        <template v-if="authStore.isAuthenticated">
          <router-link
            to="/upload"
            class="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition cursor-pointer"
          >
            <UploadCloud class="h-3.5 w-3.5" />
            <span>Upload Asset</span>
          </router-link>
        </template>

        <!-- User Account Dropdown (When Logged In) -->
        <template v-if="authStore.isAuthenticated">
          <div class="relative" ref="dropdownRef">
            <button
              @click.stop="isDropdownOpen = !isDropdownOpen"
              class="flex items-center gap-2 rounded-xl border border-border bg-elevated/90 px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:border-border-hover transition cursor-pointer"
              :class="{ 'ring-1 ring-primary/40 border-primary/40': isDropdownOpen }"
              aria-haspopup="true"
              :aria-expanded="isDropdownOpen"
            >
              <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-white shrink-0">
                {{ authStore.user?.name?.charAt(0).toUpperCase() || 'U' }}
              </div>
              <span class="max-w-[75px] sm:max-w-[95px] truncate text-xs font-medium">{{ authStore.user?.name }}</span>
              <ChevronDown class="h-3.5 w-3.5 text-text-secondary transition-transform duration-200" :class="{ 'rotate-180': isDropdownOpen }" />
            </button>

            <!-- DROPDOWN MENU POPOVER -->
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="transform scale-95 opacity-0 -translate-y-1"
              enter-to-class="transform scale-100 opacity-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="transform scale-100 opacity-100 translate-y-0"
              leave-to-class="transform scale-95 opacity-0 -translate-y-1"
            >
              <div
                v-if="isDropdownOpen"
                class="absolute right-0 mt-2 w-64 rounded-2xl border border-border/90 bg-elevated/95 backdrop-blur-xl p-2 shadow-2xl z-50 divide-y divide-border/60 text-xs"
              >
                <!-- Profile Header -->
                <div class="px-3 py-2.5 space-y-1">
                  <p class="font-bold text-text-primary truncate">{{ authStore.user?.name }}</p>
                  <p class="text-[11px] text-text-secondary truncate">{{ authStore.user?.email }}</p>
                  <div class="pt-1 flex items-center gap-1.5">
                    <span
                      v-if="authStore.isSuperAdmin"
                      class="inline-flex items-center gap-1 rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider"
                    >
                      <ShieldAlert class="h-3 w-3" />
                      <span>Superadmin</span>
                    </span>
                    <span
                      v-else-if="authStore.isAdmin"
                      class="inline-flex items-center gap-1 rounded-md bg-secondary/15 border border-secondary/30 px-2 py-0.5 text-[10px] font-bold text-secondary uppercase tracking-wider"
                    >
                      <ShieldCheck class="h-3 w-3" />
                      <span>Admin</span>
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center rounded-md bg-elevated-subtle px-2 py-0.5 text-[10px] font-medium text-text-secondary"
                    >
                      Kreator &amp; Pembeli
                    </span>
                  </div>
                </div>

                <!-- Group 1: User / Creator Portfolio -->
                <div class="py-1.5 space-y-0.5">
                  <router-link
                    to="/purchases"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <FolderArchive class="h-4 w-4 text-secondary shrink-0" />
                    <span>My Assets (Vault)</span>
                  </router-link>
                  <router-link
                    to="/listings"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <Layers class="h-4 w-4 text-primary shrink-0" />
                    <span>My Listings</span>
                  </router-link>
                  <router-link
                    to="/transactions"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <Receipt class="h-4 w-4 text-text-secondary shrink-0" />
                    <span>Riwayat Transaksi</span>
                  </router-link>
                  <router-link
                    to="/revenue"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <Wallet class="h-4 w-4 text-success shrink-0" />
                    <span>Revenue &amp; Payout (60%)</span>
                  </router-link>
                </div>

                <!-- Group 2: Admin & Superadmin Controls (Role-Protected) -->
                <div v-if="authStore.isAdmin || authStore.isSuperAdmin" class="py-1.5 space-y-0.5">
                  <div class="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Admin Center
                  </div>
                  <router-link
                    to="/admin/approvals"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <ShieldCheck class="h-4 w-4 text-primary shrink-0" />
                    <span>Moderation &amp; Escrow</span>
                  </router-link>
                  <router-link
                    to="/admin/users"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <Users class="h-4 w-4 text-secondary shrink-0" />
                    <span>Manage Users</span>
                  </router-link>
                  <router-link
                    to="/admin/revenue"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <DollarSign class="h-4 w-4 text-success shrink-0" />
                    <span>Laporan Revenue</span>
                  </router-link>
                  <router-link
                    v-if="authStore.isSuperAdmin"
                    to="/admin/admins"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <ShieldAlert class="h-4 w-4 text-primary shrink-0" />
                    <span>Manage Admins</span>
                  </router-link>
                </div>

                <!-- Group 3: Settings & Dashboard -->
                <div class="py-1.5 space-y-0.5">
                  <router-link
                    to="/dashboard"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <LayoutDashboard class="h-4 w-4 text-text-secondary shrink-0" />
                    <span>Dashboard</span>
                  </router-link>
                  <router-link
                    to="/settings/payment"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <CreditCard class="h-4 w-4 text-text-secondary shrink-0" />
                    <span>Payment Settings</span>
                  </router-link>
                  <router-link
                    to="/settings/profile"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                    @click="isDropdownOpen = false"
                  >
                    <UserCheck class="h-4 w-4 text-text-secondary shrink-0" />
                    <span>Edit Profile</span>
                  </router-link>
                </div>

                <!-- Group 4: Sign Out -->
                <div class="pt-1.5">
                  <button
                    class="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition cursor-pointer"
                    @click="handleLogout"
                  >
                    <LogOut class="h-4 w-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </template>

        <!-- Guest State (Sign In & Register) -->
        <template v-else>
          <div class="flex items-center gap-2">
            <router-link
              to="/login"
              class="text-xs font-semibold text-text-secondary hover:text-text-primary px-3 py-2 transition"
            >
              Sign In
            </router-link>
            <router-link
              to="/register"
              class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition cursor-pointer"
            >
              <User class="h-3.5 w-3.5" />
              <span>Daftar</span>
            </router-link>
          </div>
        </template>

        <!-- Mobile Menu Trigger -->
        <button
          class="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-xl border border-border bg-elevated/70"
          @click="mobileMenuOpen = !mobileMenuOpen"
          aria-label="Toggle Navigation"
        >
          <Menu v-if="!mobileMenuOpen" class="h-5 w-5" />
          <X v-else class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <div v-if="mobileMenuOpen" class="md:hidden border-t border-border bg-elevated px-4 py-4 space-y-3">
      <!-- Mobile Search Input -->
      <div class="relative w-full mb-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari aset digital..."
          class="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          @keyup.enter="handleSearch(); mobileMenuOpen = false;"
        />
        <Search class="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
      </div>

      <!-- Main Navigation -->
      <div class="space-y-1 pb-2 border-b border-border/60">
        <router-link
          to="/"
          class="block py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          @click="mobileMenuOpen = false"
        >
          Home
        </router-link>
        <router-link
          to="/explore"
          class="block py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          @click="mobileMenuOpen = false"
        >
          Catalog
        </router-link>
        <router-link
          to="/panduan"
          class="block py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          @click="mobileMenuOpen = false"
        >
          Panduan
        </router-link>
      </div>

      <!-- Logged-in User Links on Mobile -->
      <template v-if="authStore.isAuthenticated">
        <!-- Standout Upload Button -->
        <router-link
          to="/upload"
          class="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-hover transition"
          @click="mobileMenuOpen = false"
        >
          <UploadCloud class="h-4 w-4" />
          <span>Upload Asset Baru</span>
        </router-link>

        <div class="space-y-1 pt-1 pb-2 border-b border-border/60">
          <p class="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">Akun &amp; Portofolio</p>
          <router-link
            to="/purchases"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <FolderArchive class="h-4 w-4 text-secondary" />
            <span>My Assets (Vault)</span>
          </router-link>
          <router-link
            to="/listings"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <Layers class="h-4 w-4 text-primary" />
            <span>My Listings</span>
          </router-link>
          <router-link
            to="/transactions"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <Receipt class="h-4 w-4 text-text-secondary" />
            <span>Riwayat Transaksi</span>
          </router-link>
          <router-link
            to="/revenue"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <Wallet class="h-4 w-4 text-success" />
            <span>Revenue &amp; Payout</span>
          </router-link>
        </div>

        <!-- Admin Controls in Mobile (if admin) -->
        <div v-if="authStore.isAdmin || authStore.isSuperAdmin" class="space-y-1 pt-1 pb-2 border-b border-border/60">
          <p class="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">Admin Center</p>
          <router-link
            to="/admin/approvals"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <ShieldCheck class="h-4 w-4 text-primary" />
            <span>Moderation &amp; Escrow</span>
          </router-link>
          <router-link
            to="/admin/users"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <Users class="h-4 w-4 text-secondary" />
            <span>Manage Users</span>
          </router-link>
          <router-link
            to="/admin/revenue"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <DollarSign class="h-4 w-4 text-success" />
            <span>Laporan Revenue</span>
          </router-link>
          <router-link
            v-if="authStore.isSuperAdmin"
            to="/admin/admins"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <ShieldAlert class="h-4 w-4 text-primary" />
            <span>Manage Admins</span>
          </router-link>
        </div>

        <!-- Settings & Session -->
        <div class="space-y-1 pt-1">
          <router-link
            to="/dashboard"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <LayoutDashboard class="h-4 w-4 text-text-secondary" />
            <span>Dashboard Overview</span>
          </router-link>
          <router-link
            to="/settings/payment"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <CreditCard class="h-4 w-4 text-text-secondary" />
            <span>Payment Settings</span>
          </router-link>
          <router-link
            to="/settings/profile"
            class="flex items-center gap-2.5 py-1.5 px-2 text-xs text-text-secondary hover:text-text-primary rounded-lg hover:bg-elevated-subtle"
            @click="mobileMenuOpen = false"
          >
            <UserCheck class="h-4 w-4 text-text-secondary" />
            <span>Edit Profil</span>
          </router-link>

          <button
            class="flex w-full items-center gap-2.5 py-2 px-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" />
            <span>Sign Out ({{ authStore.user?.name }})</span>
          </button>
        </div>
      </template>

      <!-- Guest Links on Mobile -->
      <template v-else>
        <div class="pt-2 flex flex-col gap-2">
          <router-link
            to="/login"
            class="flex items-center justify-center py-2 text-xs font-semibold text-text-primary border border-border rounded-xl bg-elevated/70"
            @click="mobileMenuOpen = false"
          >
            Sign In
          </router-link>
          <router-link
            to="/register"
            class="flex items-center justify-center py-2 text-xs font-bold text-white bg-primary rounded-xl shadow-sm"
            @click="mobileMenuOpen = false"
          >
            Daftar Akun Baru
          </router-link>
        </div>
      </template>
    </div>
  </header>
</template>
