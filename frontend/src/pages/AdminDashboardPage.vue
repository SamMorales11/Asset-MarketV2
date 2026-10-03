<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminService } from '../services/admin';
import { formatCurrency } from '../utils/formatters';
import type { AdminDashboardData } from '../types';
import AdminNav from '../components/AdminNav.vue';
import {
  Users,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Loader2,
  Activity,
} from 'lucide-vue-next';

const dashboardData = ref<AdminDashboardData | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const data = await adminService.getDashboard();
    dashboardData.value = data;
  } catch (err: any) {
    console.error('Failed to load admin dashboard:', err);
    errorMessage.value = err?.message || 'Gagal memuat dashboard admin.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Admin Dashboard</span>
    </nav>

    <!-- Admin Sub-Navigation -->
    <AdminNav />

    <!-- LOADING STATE -->
    <div v-if="isLoading" class="py-24 text-center">
      <div class="inline-flex items-center justify-center p-4 rounded-3xl bg-elevated border border-border text-primary animate-spin mb-4">
        <Loader2 class="h-8 w-8" />
      </div>
      <h2 class="font-heading text-2xl font-bold text-text-primary">
        Memuat Metrik Sistem Admin...
      </h2>
      <p class="text-xs text-text-secondary mt-1">Mengambil statistik transaksi, antrean, dan pengguna.</p>
    </div>

    <!-- ERROR STATE -->
    <div
      v-else-if="errorMessage"
      class="rounded-3xl border border-red-500/30 bg-red-500/10 p-10 text-center"
    >
      <AlertCircle class="mx-auto h-8 w-8 text-red-400 mb-2" />
      <p class="text-xs text-red-400 mb-4">{{ errorMessage }}</p>
      <button
        class="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition"
        @click="loadDashboard"
      >
        Muat Ulang
      </button>
    </div>

    <!-- DASHBOARD CONTENT (HIGH INFORMATION DENSITY) -->
    <div v-else-if="dashboardData" class="space-y-8">
      <!-- 1. HIGH DENSITY 5 METRIC CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Card 1: Pending Queue -->
        <div class="rounded-3xl border border-primary/40 bg-primary/10 p-5 backdrop-blur-md space-y-2 shadow-xl hover:border-primary transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-primary font-bold uppercase tracking-wider">
              <span>Antrean Review</span>
              <ShieldAlert class="h-4 w-4" />
            </div>
            <div class="font-mono text-3xl font-bold text-text-primary pt-1">
              {{ dashboardData.stats.pendingAssetsCount + dashboardData.stats.pendingPaymentsCount }}
            </div>
            <div class="text-[11px] text-text-secondary mt-1">
              {{ dashboardData.stats.pendingAssetsCount }} Aset • {{ dashboardData.stats.pendingPaymentsCount }} Pembayaran
            </div>
          </div>
          <router-link
            to="/admin/approvals"
            class="mt-3 inline-flex items-center justify-between text-[11px] font-semibold text-primary hover:underline pt-2 border-t border-primary/20"
          >
            <span>Buka Antrean</span>
            <ArrowUpRight class="h-3 w-3" />
          </router-link>
        </div>

        <!-- Card 2: Total Users -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-border-hover transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-text-secondary">
              <span>Total Pengguna</span>
              <Users class="h-4 w-4 text-secondary" />
            </div>
            <div class="font-mono text-3xl font-bold text-text-primary pt-1">
              {{ dashboardData.stats.totalUsers }}
            </div>
            <div class="text-[11px] text-text-secondary mt-1">
              <span class="text-success">{{ dashboardData.stats.activeUsers }} Aktif</span> •
              <span class="text-text-secondary">{{ dashboardData.stats.sellersCount }} Penjual</span>
            </div>
          </div>
          <router-link
            to="/admin/users"
            class="mt-3 inline-flex items-center justify-between text-[11px] font-semibold text-secondary hover:underline pt-2 border-t border-border/40"
          >
            <span>Kelola User</span>
            <ArrowUpRight class="h-3 w-3" />
          </router-link>
        </div>

        <!-- Card 3: Total Transactions / GMV -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-border-hover transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-text-secondary">
              <span>Total Transaksi</span>
              <Receipt class="h-4 w-4 text-text-secondary" />
            </div>
            <div class="font-mono text-3xl font-bold text-text-primary pt-1">
              {{ dashboardData.stats.totalTransactions }}
            </div>
            <div class="text-[11px] text-text-secondary mt-1">
              {{ dashboardData.stats.paidTransactionsCount }} Paid • {{ dashboardData.stats.processingTransactionsCount }} Review
            </div>
          </div>
          <div class="mt-3 text-[11px] text-text-secondary pt-2 border-t border-border/40 font-mono truncate">
            GMV: <strong class="text-text-primary">{{ formatCurrency(dashboardData.stats.revenue.grossVolume) }}</strong>
          </div>
        </div>

        <!-- Card 4: Platform Revenue 40% -->
        <div class="rounded-3xl border border-secondary/30 bg-secondary/10 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-secondary transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-secondary font-bold uppercase tracking-wider">
              <span>Platform 40%</span>
              <DollarSign class="h-4 w-4" />
            </div>
            <div class="font-mono text-2xl sm:text-3xl font-bold text-secondary pt-1 truncate">
              {{ formatCurrency(dashboardData.stats.revenue.platformRevenue) }}
            </div>
            <div class="text-[11px] text-text-secondary mt-1">
              Akumulasi fee escrow platform
            </div>
          </div>
          <router-link
            to="/admin/revenue"
            class="mt-3 inline-flex items-center justify-between text-[11px] font-semibold text-secondary hover:underline pt-2 border-t border-secondary/20"
          >
            <span>Buku Besar Revenue</span>
            <ArrowUpRight class="h-3 w-3" />
          </router-link>
        </div>

        <!-- Card 5: Creator Payouts 60% -->
        <div class="rounded-3xl border border-success/30 bg-success/10 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-success transition flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-success font-bold uppercase tracking-wider">
              <span>Kreator 60%</span>
              <Wallet class="h-4 w-4" />
            </div>
            <div class="font-mono text-2xl sm:text-3xl font-bold text-success pt-1 truncate">
              {{ formatCurrency(dashboardData.stats.revenue.creatorPayouts) }}
            </div>
            <div class="text-[11px] text-text-secondary mt-1">
              Hak bagi hasil para kreator
            </div>
          </div>
          <div class="mt-3 text-[11px] text-success pt-2 border-t border-success/20 font-semibold">
            Skema Otomatis 60/40
          </div>
        </div>
      </div>

      <!-- 2. TWO-COLUMN MAIN CONTENT (8 COLS / 4 COLS) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- LEFT COLUMN: 8 COLS (RECENT TRANSACTIONS & AUDIT LOGS) -->
        <div class="lg:col-span-8 space-y-8">
          <!-- A. RECENT TRANSACTIONS TABLE -->
          <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div class="flex items-center justify-between border-b border-border pb-4">
              <div class="flex items-center gap-2">
                <Receipt class="h-5 w-5 text-secondary" />
                <h3 class="font-heading text-xl font-bold text-text-primary">
                  Transaksi Terbaru Marketplace
                </h3>
              </div>
              <router-link
                to="/admin/approvals"
                class="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
              >
                <span>Verifikasi Pembayaran</span>
                <ArrowUpRight class="h-3.5 w-3.5" />
              </router-link>
            </div>

            <!-- Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <th class="py-3 px-3">Invoice</th>
                    <th class="py-3 px-3">Pembeli</th>
                    <th class="py-3 px-3 text-right">Nominal Tagihan</th>
                    <th class="py-3 px-3 text-center">Status</th>
                    <th class="py-3 px-3 text-right">Waktu</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr
                    v-for="tx in dashboardData.recentTransactions"
                    :key="tx.id"
                    class="hover:bg-elevated transition"
                  >
                    <td class="py-3 px-3 font-mono font-bold text-text-primary">
                      {{ tx.invoiceNumber }}
                    </td>
                    <td class="py-3 px-3 text-text-primary truncate max-w-[180px]">
                      {{ tx.buyer?.name || 'User #' + tx.id.substring(0, 6) }}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-text-primary">
                      {{ formatCurrency(Number(tx.totalAmount)) }}
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span
                        v-if="tx.status === 'paid'"
                        class="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/30 px-2 py-0.5 text-[10px] font-bold text-success"
                      >
                        <CheckCircle2 class="h-2.5 w-2.5" />
                        <span>Paid</span>
                      </span>
                      <span
                        v-else-if="tx.status === 'processing'"
                        class="inline-flex items-center gap-1 rounded-full bg-secondary/10 border border-secondary/30 px-2 py-0.5 text-[10px] font-bold text-secondary"
                      >
                        <Clock class="h-2.5 w-2.5" />
                        <span>Review</span>
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400"
                      >
                        <Clock class="h-2.5 w-2.5" />
                        <span>{{ tx.status }}</span>
                      </span>
                    </td>
                    <td class="py-3 px-3 text-right text-[11px] text-text-secondary font-mono">
                      {{ new Date(tx.createdAt).toLocaleDateString('id-ID', { dateStyle: 'short' }) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- B. AUDIT TRAIL LOGS -->
          <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div class="flex items-center justify-between border-b border-border pb-4">
              <div class="flex items-center gap-2">
                <Activity class="h-5 w-5 text-primary" />
                <h3 class="font-heading text-xl font-bold text-text-primary">
                  Audit Trail & Log Tindakan Admin
                </h3>
              </div>
              <span class="rounded bg-elevated-subtle border border-border px-2 py-0.5 text-[10px] font-mono text-text-secondary">
                Immutable Log
              </span>
            </div>

            <!-- List -->
            <div v-if="dashboardData.recentAuditLogs.length === 0" class="py-6 text-center text-xs text-text-secondary">
              Belum ada riwayat tindakan admin.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="log in dashboardData.recentAuditLogs"
                :key="log.id"
                class="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background p-3.5 text-xs"
              >
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase bg-primary/15 text-primary border border-primary/30">
                      {{ log.action }}
                    </span>
                    <span class="font-bold text-text-primary">
                      {{ log.adminName || 'Admin' }}
                    </span>
                    <span class="text-text-secondary">• {{ log.targetEntity }}</span>
                  </div>
                  <p class="text-[11px] text-text-secondary truncate">
                    {{ log.notes || 'No extra notes' }}
                  </p>
                </div>

                <span class="text-[10px] text-text-secondary font-mono shrink-0">
                  {{ new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: 4 COLS (RECENT USERS & CONTROL ACTIONS) -->
        <div class="lg:col-span-4 space-y-6">
          <!-- 1. RECENT REGISTERED USERS -->
          <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <Users class="h-4 w-4 text-secondary" />
                <h4 class="font-heading text-lg font-bold text-text-primary">
                  Pengguna Baru Mendaftar
                </h4>
              </div>
              <router-link
                to="/admin/users"
                class="text-[11px] font-semibold text-secondary hover:underline"
              >
                Semua User
              </router-link>
            </div>

            <div class="space-y-3">
              <div
                v-for="user in dashboardData.recentUsers"
                :key="user.id"
                class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-3 text-xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-elevated border border-border text-xs font-bold text-primary">
                    {{ user.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="truncate">
                    <p class="font-bold text-text-primary truncate">{{ user.name }}</p>
                    <p class="text-[10px] text-text-secondary truncate">{{ user.email }}</p>
                  </div>
                </div>

                <span
                  class="rounded px-2 py-0.5 text-[9px] font-bold uppercase shrink-0"
                  :class="
                    user.role === 'superadmin'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : user.role === 'admin'
                      ? 'bg-primary/20 text-primary border border-primary/40'
                      : 'bg-elevated-subtle text-text-secondary border border-border'
                  "
                >
                  {{ user.role }}
                </span>
              </div>
            </div>
          </div>

          <!-- 2. QUICK ADMIN CONTROLS -->
          <div class="rounded-3xl border border-border bg-elevated/60 p-5 space-y-3">
            <h4 class="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Pusat Kontrol Cepat
            </h4>

            <router-link
              to="/admin/approvals"
              class="flex items-center justify-between rounded-xl bg-background border border-border p-3 text-xs text-text-primary hover:border-primary transition shadow-sm"
            >
              <div class="flex items-center gap-2">
                <ShieldCheck class="h-4 w-4 text-primary" />
                <span class="font-bold">Moderasi Aset & Pembayaran</span>
              </div>
              <span class="rounded-full bg-primary/20 text-primary px-2 py-0.5 text-[10px] font-bold">
                {{ dashboardData.stats.pendingAssetsCount + dashboardData.stats.pendingPaymentsCount }}
              </span>
            </router-link>

            <router-link
              to="/admin/users"
              class="flex items-center justify-between rounded-xl bg-background border border-border p-3 text-xs text-text-primary hover:border-secondary transition shadow-sm"
            >
              <div class="flex items-center gap-2">
                <Users class="h-4 w-4 text-secondary" />
                <span class="font-bold">Kelola Hak Akses Pengguna</span>
              </div>
              <ArrowUpRight class="h-3.5 w-3.5 text-text-secondary" />
            </router-link>

            <router-link
              to="/admin/revenue"
              class="flex items-center justify-between rounded-xl bg-background border border-border p-3 text-xs text-text-primary hover:border-success transition shadow-sm"
            >
              <div class="flex items-center gap-2">
                <TrendingUp class="h-4 w-4 text-success" />
                <span class="font-bold">Laporan Pendapatan 60/40</span>
              </div>
              <ArrowUpRight class="h-3.5 w-3.5 text-text-secondary" />
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
