<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { adminService } from '../services/admin';
import { formatCurrency } from '../utils/formatters';
import type { AdminDashboardData } from '../types';
import AdminNav from '../components/AdminNav.vue';
import EmptyState from '../components/EmptyState.vue';
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
  Activity,
  Zap,
  TrendingDown,
  BarChart3,
  ChevronRight,
  Globe,
  Server,
  Eye,
  ArrowUp,
  ArrowDown,
} from 'lucide-vue-next';

const dashboardData = ref<AdminDashboardData | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

// Animated counter state
const countersReady = ref(false);

onMounted(async () => {
  await loadDashboard();
  // Trigger counter animation on mount
  setTimeout(() => { countersReady.value = true; }, 100);
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

// Format timestamp
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

// Revenue mini chart data (mock % distribution for visual)
const revenueBreakdown = computed(() => {
  if (!dashboardData.value) return [];
  const r = dashboardData.value.stats.revenue;
  const gross = Number(r.grossVolume) || 1;
  return [
    { label: 'Platform 40%', value: Number(r.platformRevenue), pct: Math.round((Number(r.platformRevenue) / gross) * 100), color: 'secondary' },
    { label: 'Kreator 60%', value: Number(r.creatorPayouts), pct: Math.round((Number(r.creatorPayouts) / gross) * 100), color: 'success' },
  ];
});

const pendingTotal = computed(() => {
  if (!dashboardData.value) return 0;
  return dashboardData.value.stats.pendingAssetsCount + dashboardData.value.stats.pendingPaymentsCount;
});

const currentDate = new Date().toLocaleDateString('id-ID', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
</script>

<template>
  <div class="min-h-screen">

    <!-- ════════════════════════════════
         PAGE HEADER / COMMAND BAR
         ════════════════════════════════ -->
    <div class="border-b border-border/40 bg-elevated/60 backdrop-blur-sm sticky top-0 z-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex items-center justify-between gap-4">
          <!-- Left: breadcrumb -->
          <nav class="flex items-center gap-2 text-[11px] text-text-muted">
            <router-link to="/" class="hover:text-text-secondary transition-colors">Home</router-link>
            <ChevronRight class="h-3 w-3" />
            <span class="text-text-secondary font-semibold">Admin Center</span>
          </nav>

          <!-- Center: live status -->
          <div class="hidden md:flex items-center gap-1.5 text-[10px] text-text-muted">
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-success"></span>
            </span>
            <span>System Operational</span>
          </div>

          <!-- Right: date + user -->
          <div class="flex items-center gap-3">
            <div class="hidden sm:block text-right">
              <p class="text-[10px] text-text-muted">{{ currentDate }}</p>
            </div>
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary text-xs font-bold border border-primary/30">
              A
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════
         MAIN CONTENT
         ════════════════════════════════ -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <!-- ── ADMIN SUB-NAV ── -->
      <AdminNav />

      <!-- ════════════════════════════════
           LOADING SKELETON
           ════════════════════════════════ -->
      <div v-if="isLoading" class="space-y-8">
        <!-- Stat cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <div v-for="n in 5" :key="n" class="rounded-2xl border border-border/40 bg-elevated/60 p-5 space-y-3">
            <div class="flex justify-between">
              <div class="h-3 w-24 bg-border/30 rounded skeleton-shimmer"></div>
              <div class="h-5 w-5 bg-border/30 rounded-md skeleton-shimmer"></div>
            </div>
            <div class="h-9 w-32 bg-border/20 rounded-lg skeleton-shimmer"></div>
            <div class="h-3 w-40 bg-border/20 rounded skeleton-shimmer"></div>
            <div class="h-px w-full bg-border/20"></div>
            <div class="h-3 w-24 bg-border/20 rounded skeleton-shimmer"></div>
          </div>
        </div>
        <!-- Main grid skeleton -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-8 space-y-6">
            <div v-for="n in 2" :key="n" class="rounded-2xl border border-border/40 bg-elevated/60 p-6 space-y-4">
              <div class="flex justify-between">
                <div class="h-5 w-56 bg-border/30 rounded skeleton-shimmer"></div>
                <div class="h-4 w-24 bg-border/20 rounded skeleton-shimmer"></div>
              </div>
              <div v-for="r in 4" :key="r" class="flex items-center gap-4 py-3 border-t border-border/20">
                <div class="h-3 w-20 bg-border/20 rounded skeleton-shimmer"></div>
                <div class="h-3 w-32 bg-border/20 rounded skeleton-shimmer"></div>
                <div class="h-3 w-20 bg-border/20 rounded ml-auto skeleton-shimmer"></div>
                <div class="h-5 w-16 bg-border/20 rounded-full skeleton-shimmer"></div>
                <div class="h-3 w-16 bg-border/20 rounded skeleton-shimmer"></div>
              </div>
            </div>
          </div>
          <div class="lg:col-span-4 space-y-6">
            <div v-for="n in 2" :key="n" class="rounded-2xl border border-border/40 bg-elevated/60 p-5 space-y-3">
              <div class="h-5 w-40 bg-border/30 rounded skeleton-shimmer"></div>
              <div v-for="r in 3" :key="r" class="h-14 bg-border/20 rounded-xl skeleton-shimmer"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════
           ERROR STATE
           ════════════════════════════════ -->
      <div
        v-else-if="errorMessage"
        class="rounded-3xl border border-red-500/25 bg-red-500/8 p-16 text-center space-y-4"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 mx-auto">
          <AlertCircle class="h-7 w-7 text-red-400" />
        </div>
        <h3 class="font-heading text-2xl font-bold text-text-primary">Gagal Memuat Dashboard</h3>
        <p class="text-sm text-text-secondary max-w-md mx-auto">{{ errorMessage }}</p>
        <button
          class="rounded-xl bg-primary px-7 py-2.5 text-xs font-bold text-white hover:bg-primary-hover transition-colors"
          @click="loadDashboard"
        >
          Muat Ulang
        </button>
      </div>

      <!-- ════════════════════════════════
           DASHBOARD CONTENT
           ════════════════════════════════ -->
      <div v-else-if="dashboardData" class="space-y-8">

        <!-- ── 5 KPI STAT CARDS ── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">

          <!-- CARD 1: Pending Queue (ALERT) -->
          <div class="group relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/12 to-transparent p-5 space-y-3 overflow-hidden hover:border-primary/60 transition-all duration-300">
            <!-- Glow -->
            <div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl pointer-events-none group-hover:bg-primary/20 transition-all duration-500"></div>
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-primary">Antrean Review</span>
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25">
                  <ShieldAlert class="h-4 w-4" />
                </div>
              </div>
              <div class="font-heading text-4xl font-bold text-text-primary tabular-nums">
                {{ pendingTotal }}
              </div>
              <div class="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                <span class="flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                  {{ dashboardData.stats.pendingAssetsCount }} Aset
                </span>
                <span class="flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-secondary"></span>
                  {{ dashboardData.stats.pendingPaymentsCount }} Bayar
                </span>
              </div>
            </div>
            <div class="border-t border-primary/20 pt-2.5">
              <router-link
                to="/admin/approvals"
                class="flex items-center justify-between text-[11px] font-semibold text-primary group-hover:gap-1 transition-all"
              >
                <span>Buka Antrean</span>
                <ArrowUpRight class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>

          <!-- CARD 2: Total Users -->
          <div class="group relative rounded-2xl border border-border/60 bg-elevated/70 p-5 space-y-3 overflow-hidden hover:border-secondary/40 transition-all duration-300">
            <div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-secondary/8 blur-2xl pointer-events-none"></div>
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total Pengguna</span>
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                  <Users class="h-4 w-4" />
                </div>
              </div>
              <div class="font-heading text-4xl font-bold text-text-primary tabular-nums">
                {{ dashboardData.stats.totalUsers }}
              </div>
              <div class="flex items-center gap-3 mt-1.5 text-[11px]">
                <span class="flex items-center gap-1 text-success">
                  <ArrowUp class="h-2.5 w-2.5" />
                  {{ dashboardData.stats.activeUsers }} Aktif
                </span>
                <span class="text-text-muted">{{ dashboardData.stats.sellersCount }} Penjual</span>
              </div>
            </div>
            <div class="border-t border-border/40 pt-2.5">
              <router-link
                to="/admin/users"
                class="flex items-center justify-between text-[11px] font-semibold text-secondary"
              >
                <span>Kelola User</span>
                <ArrowUpRight class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>

          <!-- CARD 3: Total Transactions -->
          <div class="group relative rounded-2xl border border-border/60 bg-elevated/70 p-5 space-y-3 overflow-hidden hover:border-border/80 transition-all duration-300">
            <div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-text-primary/5 blur-2xl pointer-events-none"></div>
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-text-muted">Transaksi</span>
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-surface border border-border text-text-secondary">
                  <Receipt class="h-4 w-4" />
                </div>
              </div>
              <div class="font-heading text-4xl font-bold text-text-primary tabular-nums">
                {{ dashboardData.stats.totalTransactions }}
              </div>
              <div class="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted">
                <span>{{ dashboardData.stats.paidTransactionsCount }} Paid</span>
                <span>•</span>
                <span>{{ dashboardData.stats.processingTransactionsCount }} Review</span>
              </div>
            </div>
            <div class="border-t border-border/40 pt-2.5">
              <div class="text-[11px] text-text-muted font-mono truncate">
                GMV <strong class="text-text-primary">{{ formatCurrency(dashboardData.stats.revenue.grossVolume) }}</strong>
              </div>
            </div>
          </div>

          <!-- CARD 4: Platform Revenue 40% -->
          <div class="group relative rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/12 to-transparent p-5 space-y-3 overflow-hidden hover:border-secondary/50 transition-all duration-300">
            <div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-secondary/10 blur-2xl pointer-events-none group-hover:bg-secondary/20 transition-all duration-500"></div>
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-secondary">Platform 40%</span>
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary border border-secondary/25">
                  <DollarSign class="h-4 w-4" />
                </div>
              </div>
              <div class="font-heading text-3xl xl:text-4xl font-bold text-secondary tabular-nums truncate">
                {{ formatCurrency(dashboardData.stats.revenue.platformRevenue) }}
              </div>
              <div class="mt-1.5">
                <!-- Mini bar visualization -->
                <div class="flex items-center gap-1.5">
                  <div class="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      class="h-full rounded-full bg-secondary transition-all duration-700"
                      style="width: 40%"
                    ></div>
                  </div>
                  <span class="text-[10px] font-mono text-secondary font-bold">40%</span>
                </div>
              </div>
            </div>
            <div class="border-t border-secondary/20 pt-2.5">
              <router-link
                to="/admin/revenue"
                class="flex items-center justify-between text-[11px] font-semibold text-secondary"
              >
                <span>Buku Besar</span>
                <ArrowUpRight class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>

          <!-- CARD 5: Creator Payouts 60% -->
          <div class="group relative rounded-2xl border border-success/30 bg-gradient-to-br from-success/12 to-transparent p-5 space-y-3 overflow-hidden hover:border-success/50 transition-all duration-300">
            <div class="absolute top-0 right-0 h-24 w-24 rounded-full bg-success/10 blur-2xl pointer-events-none group-hover:bg-success/20 transition-all duration-500"></div>
            <div class="relative">
              <div class="flex items-center justify-between mb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-success">Kreator 60%</span>
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-success/15 text-success border border-success/25">
                  <Wallet class="h-4 w-4" />
                </div>
              </div>
              <div class="font-heading text-3xl xl:text-4xl font-bold text-success tabular-nums truncate">
                {{ formatCurrency(dashboardData.stats.revenue.creatorPayouts) }}
              </div>
              <div class="mt-1.5">
                <div class="flex items-center gap-1.5">
                  <div class="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      class="h-full rounded-full bg-success transition-all duration-700"
                      style="width: 60%"
                    ></div>
                  </div>
                  <span class="text-[10px] font-mono text-success font-bold">60%</span>
                </div>
              </div>
            </div>
            <div class="border-t border-success/20 pt-2.5">
              <div class="flex items-center gap-1 text-[11px] font-semibold text-success">
                <Zap class="h-3 w-3" />
                <span>Otomatis 60/40</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── MAIN 12-COLUMN GRID ── -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          <!-- ═══ LEFT 8 COLS ═══ -->
          <div class="lg:col-span-8 space-y-6">

            <!-- ─── A. RECENT TRANSACTIONS ─── -->
            <div class="rounded-2xl border border-border/60 bg-elevated/80 shadow-xl overflow-hidden">
              <!-- Card header -->
              <div class="flex items-center justify-between px-6 py-5 border-b border-border/40">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                    <Receipt class="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 class="font-heading text-lg font-bold text-text-primary leading-tight">Transaksi Marketplace</h3>
                    <p class="text-[10px] text-text-muted mt-0.5">Aktivitas pembayaran terbaru</p>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span class="hidden sm:flex items-center gap-1.5 rounded-full bg-elevated/60 border border-border/60 px-2.5 py-1 text-[10px] font-mono text-text-muted">
                    <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                    Live
                  </span>
                  <router-link
                    to="/admin/approvals"
                    class="flex items-center gap-1.5 text-[11px] font-semibold text-secondary hover:text-secondary-hover transition-colors"
                  >
                    <span>Verifikasi</span>
                    <ArrowUpRight class="h-3.5 w-3.5" />
                  </router-link>
                </div>
              </div>

              <!-- Empty state -->
              <EmptyState
                v-if="dashboardData.recentTransactions.length === 0"
                compact
                icon="receipt"
                icon-color="muted"
                title="Belum Ada Transaksi"
                description="Catatan transaksi akan otomatis muncul di sini saat ada aktivitas marketplace."
              />

              <!-- Table -->
              <div v-else class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="bg-surface/50 border-b border-border/40">
                      <th class="py-3.5 px-6 text-[9px] font-bold uppercase tracking-widest text-text-muted">Invoice</th>
                      <th class="py-3.5 px-4 text-[9px] font-bold uppercase tracking-widest text-text-muted">Pembeli</th>
                      <th class="py-3.5 px-4 text-[9px] font-bold uppercase tracking-widest text-text-muted text-right">Nominal</th>
                      <th class="py-3.5 px-4 text-[9px] font-bold uppercase tracking-widest text-text-muted text-center">Status</th>
                      <th class="py-3.5 px-6 text-[9px] font-bold uppercase tracking-widest text-text-muted text-right">Waktu</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/30">
                    <tr
                      v-for="tx in dashboardData.recentTransactions"
                      :key="tx.id"
                      class="hover:bg-surface/40 transition-colors duration-150 group"
                    >
                      <td class="py-4 px-6">
                        <span class="font-mono font-bold text-text-primary text-[11px] tracking-tight">
                          {{ tx.invoiceNumber }}
                        </span>
                      </td>
                      <td class="py-4 px-4">
                        <div class="flex items-center gap-2">
                          <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[9px] font-bold border border-primary/20">
                            {{ (tx.buyer?.name || 'U').charAt(0).toUpperCase() }}
                          </div>
                          <span class="truncate max-w-[140px] text-text-secondary font-medium text-[11px]">
                            {{ tx.buyer?.name || `User #${tx.id.substring(0, 6)}` }}
                          </span>
                        </div>
                      </td>
                      <td class="py-4 px-4 text-right">
                        <span class="font-mono font-bold text-text-primary tabular-nums">
                          {{ formatCurrency(Number(tx.totalAmount)) }}
                        </span>
                      </td>
                      <td class="py-4 px-4 text-center">
                        <span
                          v-if="tx.status === 'paid'"
                          class="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/25 px-3 py-1 text-[10px] font-bold text-success"
                        >
                          <CheckCircle2 class="h-2.5 w-2.5" />
                          Paid
                        </span>
                        <span
                          v-else-if="tx.status === 'processing'"
                          class="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/25 px-3 py-1 text-[10px] font-bold text-secondary"
                        >
                          <Clock class="h-2.5 w-2.5" />
                          Review
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-3 py-1 text-[10px] font-bold text-amber-400"
                        >
                          <Clock class="h-2.5 w-2.5" />
                          {{ tx.status }}
                        </span>
                      </td>
                      <td class="py-4 px-6 text-right">
                        <span class="font-mono text-[11px] text-text-muted">
                          {{ formatDate(tx.createdAt) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- ─── B. AUDIT TRAIL ─── -->
            <div class="rounded-2xl border border-border/60 bg-elevated/80 shadow-xl overflow-hidden">
              <div class="flex items-center justify-between px-6 py-5 border-b border-border/40">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Activity class="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 class="font-heading text-lg font-bold text-text-primary leading-tight">Audit Trail</h3>
                    <p class="text-[10px] text-text-muted mt-0.5">Log tindakan administrator — immutable record</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <router-link
                    to="/admin/audit"
                    class="rounded-lg bg-surface border border-border/60 hover:border-secondary/50 px-2.5 py-1 text-[10px] font-semibold text-secondary hover:text-secondary-light transition flex items-center gap-1"
                  >
                    <span>Buka Log Lengkap</span>
                    <ArrowUpRight class="h-3 w-3" />
                  </router-link>
                  <span class="rounded bg-surface border border-border/60 px-2.5 py-1 text-[10px] font-mono text-text-muted flex items-center gap-1">
                    <Server class="h-3 w-3" />
                    Append-only
                  </span>
                </div>
              </div>

              <EmptyState
                v-if="dashboardData.recentAuditLogs.length === 0"
                compact
                icon="inbox"
                icon-color="muted"
                title="Belum Ada Riwayat Tindakan"
                description="Seluruh aktivitas admin akan terekam secara permanen di sini."
              />

              <!-- Timeline -->
              <div v-else class="px-6 py-5">
                <div class="relative">
                  <!-- Timeline line -->
                  <div class="absolute left-[19px] top-0 bottom-0 w-px bg-border/40"></div>

                  <div class="space-y-4">
                    <div
                      v-for="(log, idx) in dashboardData.recentAuditLogs"
                      :key="log.id"
                      class="relative flex items-start gap-4 pl-1"
                    >
                      <!-- Timeline dot -->
                      <div
                        class="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[9px] font-bold uppercase transition-colors"
                        :class="
                          log.action === 'APPROVE'
                            ? 'bg-success/15 text-success border-success/30'
                            : log.action === 'REJECT'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : log.action === 'UPDATE'
                            ? 'bg-secondary/15 text-secondary border-secondary/30'
                            : 'bg-surface text-text-muted border-border'
                        "
                      >
                        <CheckCircle2 v-if="log.action === 'APPROVE'" class="h-4 w-4" />
                        <AlertCircle v-else-if="log.action === 'REJECT'" class="h-4 w-4" />
                        <ShieldCheck v-else-if="log.action === 'UPDATE'" class="h-4 w-4" />
                        <Activity v-else class="h-4 w-4" />
                      </div>

                      <!-- Content -->
                      <div class="flex-1 min-w-0 pt-1 pb-4 border-b border-border/20 last:border-0 last:pb-0">
                        <div class="flex items-start justify-between gap-2">
                          <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                              <span
                                class="rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                                :class="
                                  log.action === 'APPROVE'
                                    ? 'bg-success/15 text-success'
                                    : log.action === 'REJECT'
                                    ? 'bg-red-500/15 text-red-400'
                                    : 'bg-surface text-text-muted border border-border'
                                "
                              >
                                {{ log.action }}
                              </span>
                              <span class="text-[11px] font-bold text-text-primary">
                                {{ log.adminName || 'Admin' }}
                              </span>
                              <span class="text-[11px] text-text-muted">→ {{ log.targetEntity }}</span>
                            </div>
                            <p v-if="log.notes" class="mt-1 text-[11px] text-text-muted truncate max-w-md">
                              {{ log.notes }}
                            </p>
                          </div>
                          <span class="shrink-0 text-[10px] font-mono text-text-muted">
                            {{ formatTime(log.createdAt) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ RIGHT 4 COLS ═══ -->
          <div class="lg:col-span-4 space-y-5">

            <!-- ─── REVENUE BREAKDOWN ─── -->
            <div class="rounded-2xl border border-border/60 bg-elevated/80 shadow-xl overflow-hidden">
              <div class="px-5 py-4 border-b border-border/40">
                <div class="flex items-center gap-2">
                  <BarChart3 class="h-4 w-4 text-secondary" />
                  <h4 class="font-heading text-base font-bold text-text-primary">Revenue Breakdown</h4>
                </div>
              </div>

              <div class="p-5 space-y-4">
                <!-- Full revenue bar -->
                <div>
                  <div class="flex items-center justify-between text-[10px] text-text-muted mb-2">
                    <span>Total GMV</span>
                    <span class="font-mono font-bold text-text-primary">{{ formatCurrency(dashboardData.stats.revenue.grossVolume) }}</span>
                  </div>
                  <div class="flex h-4 rounded-full overflow-hidden gap-0.5">
                    <div
                      class="bg-secondary transition-all duration-700 flex items-center justify-center"
                      :style="{ width: `${Math.round((Number(dashboardData.stats.revenue.platformRevenue) / (Number(dashboardData.stats.revenue.grossVolume) || 1)) * 100)}%` }"
                    ></div>
                    <div
                      class="bg-success transition-all duration-700"
                      :style="{ width: `${Math.round((Number(dashboardData.stats.revenue.creatorPayouts) / (Number(dashboardData.stats.revenue.grossVolume) || 1)) * 100)}%` }"
                    ></div>
                  </div>
                  <div class="flex items-center justify-between mt-1.5 text-[10px]">
                    <span class="text-secondary font-semibold">Platform 40%</span>
                    <span class="text-success font-semibold">Kreator 60%</span>
                  </div>
                </div>

                <!-- Individual breakdown rows -->
                <div
                  v-for="item in revenueBreakdown"
                  :key="item.label"
                  class="flex items-center justify-between rounded-xl bg-surface/70 border border-border/40 p-3"
                >
                  <div class="flex items-center gap-2.5">
                    <div
                      class="h-2.5 w-2.5 rounded-sm"
                      :class="item.color === 'secondary' ? 'bg-secondary' : 'bg-success'"
                    ></div>
                    <span class="text-[11px] font-semibold text-text-secondary">{{ item.label }}</span>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] font-mono font-bold text-text-primary tabular-nums">
                      {{ formatCurrency(item.value) }}
                    </p>
                    <p
                      class="text-[10px] font-semibold"
                      :class="item.color === 'secondary' ? 'text-secondary' : 'text-success'"
                    >
                      {{ item.pct }}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── RECENT USERS ─── -->
            <div class="rounded-2xl border border-border/60 bg-elevated/80 shadow-xl overflow-hidden">
              <div class="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <div class="flex items-center gap-2">
                  <Users class="h-4 w-4 text-secondary" />
                  <h4 class="font-heading text-base font-bold text-text-primary">Pengguna Baru</h4>
                </div>
                <router-link
                  to="/admin/users"
                  class="text-[10px] font-semibold text-secondary hover:underline"
                >
                  Lihat Semua
                </router-link>
              </div>

              <EmptyState
                v-if="dashboardData.recentUsers.length === 0"
                compact
                icon="inbox"
                icon-color="muted"
                title="Belum Ada Pengguna Baru"
                description="Pengguna baru akan muncul di sini saat mendaftar."
              />

              <div v-else class="p-4 space-y-2">
                <div
                  v-for="user in dashboardData.recentUsers"
                  :key="user.id"
                  class="flex items-center justify-between gap-3 rounded-xl bg-surface/60 border border-border/40 p-3 hover:bg-surface transition-colors duration-150 group"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold border"
                      :class="
                        user.role === 'superadmin'
                          ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          : user.role === 'admin'
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'bg-secondary/10 text-secondary border-secondary/30'
                      "
                    >
                      {{ user.name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-[11px] font-bold text-text-primary truncate">{{ user.name }}</p>
                      <p class="text-[10px] text-text-muted truncate">{{ user.email }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span
                      class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                      :class="
                        user.role === 'superadmin'
                          ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                          : user.role === 'admin'
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-surface text-text-muted border border-border'
                      "
                    >
                      {{ user.role }}
                    </span>
                    <ArrowUpRight class="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>

            <!-- ─── QUICK ACTIONS ─── -->
            <div class="rounded-2xl border border-border/60 bg-elevated/80 shadow-xl overflow-hidden">
              <div class="px-5 py-4 border-b border-border/40">
                <div class="flex items-center gap-2">
                  <Zap class="h-4 w-4 text-primary" />
                  <h4 class="font-heading text-base font-bold text-text-primary">Pusat Kontrol</h4>
                </div>
              </div>
              <div class="p-4 space-y-2">
                <router-link
                  v-for="action in [
                    {
                      to: '/admin/approvals',
                      icon: ShieldCheck,
                      label: 'Moderasi Aset & Pembayaran',
                      badge: pendingTotal,
                      badgeColor: 'bg-primary/15 text-primary border-primary/30',
                      hoverColor: 'hover:border-primary/50 hover:bg-primary/5',
                    },
                    {
                      to: '/admin/users',
                      icon: Users,
                      label: 'Kelola Hak Akses',
                      badge: null,
                      badgeColor: '',
                      hoverColor: 'hover:border-secondary/50 hover:bg-secondary/5',
                    },
                    {
                      to: '/admin/revenue',
                      icon: TrendingUp,
                      label: 'Laporan Revenue 60/40',
                      badge: null,
                      badgeColor: '',
                      hoverColor: 'hover:border-success/50 hover:bg-success/5',
                    },
                  ]"
                  :key="action.to"
                  :to="action.to"
                  class="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/60 p-3.5 transition-all duration-200"
                  :class="action.hoverColor"
                >
                  <div class="flex items-center gap-3">
                    <component
                      :is="action.icon"
                      class="h-4.5 w-4.5 text-text-secondary group-hover:text-text-primary transition-colors"
                    />
                    <span class="text-[11px] font-semibold text-text-primary">{{ action.label }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="action.badge !== null"
                      class="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold border"
                      :class="action.badgeColor"
                    >
                      {{ action.badge > 9 ? '9+' : action.badge }}
                    </span>
                    <ArrowUpRight class="h-3.5 w-3.5 text-text-muted group-hover:text-text-primary transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </router-link>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>
