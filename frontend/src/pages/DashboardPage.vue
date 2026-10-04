<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { userService } from '../services/users';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback } from '../utils/imageUrl';
import type { DashboardSummary } from '../types';
import UserNav from '../components/UserNav.vue';
import StatCardSkeleton from '../components/StatCardSkeleton.vue';
import TableSkeleton from '../components/TableSkeleton.vue';
import Skeleton from '../components/Skeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import {
  TrendingUp,
  Layers,
  Receipt,
  Wallet,
  FolderArchive,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Clock,
  CreditCard,
  Sparkles,
  ExternalLink,
  Plus,
} from 'lucide-vue-next';

const summary = ref<DashboardSummary | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

onMounted(async () => {
  await loadDashboard();
});

async function loadDashboard() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const data = await userService.getDashboardSummary();
    summary.value = data;
  } catch (err: any) {
    console.error('Failed to load dashboard:', err);
    errorMessage.value = err?.message || 'Gagal memuat ringkasan dashboard.';
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
      <span class="text-text-primary font-medium">Dashboard</span>
    </nav>

    <!-- User Navigation Sub-Header -->
    <UserNav />

    <!-- LOADING STATE: SKELETON LAYOUT -->
    <div v-if="isLoading" class="space-y-8 animate-fade-in-up">
      <!-- Hero Greeting Skeleton -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-2">
          <Skeleton variant="badge" width="w-40" height="h-5" rounded="rounded-full" />
          <Skeleton variant="title" width="w-72" height="h-8" rounded="rounded-xl" />
          <Skeleton variant="text" width="w-96" height="h-3.5" rounded="rounded" />
        </div>
        <div class="flex items-center gap-3">
          <Skeleton variant="button" width="w-36" height="h-9" rounded="rounded-xl" />
          <Skeleton variant="button" width="w-28" height="h-9" rounded="rounded-xl" />
        </div>
      </div>

      <!-- 4 KPI Stat Cards Skeleton -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton v-for="n in 4" :key="n" />
      </div>

      <!-- Two-Column Layout Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Left 8 Cols -->
        <div class="lg:col-span-8 space-y-6">
          <div class="rounded-3xl border border-border/50 bg-elevated/70 p-6 space-y-4">
            <Skeleton variant="title" width="w-48" height="h-6" rounded="rounded-lg" />
            <TableSkeleton :columns="5" :rows="4" />
          </div>
          <div class="rounded-3xl border border-border/50 bg-elevated/70 p-6 space-y-4">
            <Skeleton variant="title" width="w-56" height="h-6" rounded="rounded-lg" />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton v-for="i in 2" :key="i" variant="card" height="h-28" rounded="rounded-2xl" />
            </div>
          </div>
        </div>

        <!-- Right 4 Cols -->
        <div class="lg:col-span-4 space-y-6">
          <div class="rounded-3xl border border-border/50 bg-elevated/70 p-6 space-y-4">
            <Skeleton variant="title" width="w-40" height="h-6" rounded="rounded-lg" />
            <div class="space-y-3 pt-2">
              <Skeleton variant="text" width="w-full" height="h-10" rounded="rounded-xl" />
              <Skeleton variant="text" width="w-full" height="h-10" rounded="rounded-xl" />
            </div>
          </div>
        </div>
      </div>
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
        Muat Ulang Dashboard
      </button>
    </div>

    <!-- DASHBOARD CONTENT (Z-PATTERN & F-PATTERN) -->
    <div v-else-if="summary" class="space-y-8">
      <!-- 1. Z-PATTERN TOP ROW: HERO GREETING & QUICK METRICS -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
            <Sparkles class="h-3.5 w-3.5" />
            <span>Editorial Workspace Overview</span>
          </div>
          <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
            Selamat Datang, {{ summary.profile.name }}
          </h1>
          <p class="text-xs text-text-secondary mt-1">
            Kelola karya digital, pantau komisi bagi hasil 60%, dan akses pustaka aset berlisensi Anda.
          </p>
        </div>

        <!-- Quick Top Actions (End of Z-Pattern line 1) -->
        <div class="flex items-center gap-3">
          <router-link
            to="/explore"
            class="inline-flex items-center gap-1.5 rounded-xl border border-border bg-elevated px-4 py-2 text-xs font-semibold text-text-primary hover:border-secondary transition shadow"
          >
            <FolderArchive class="h-4 w-4 text-secondary" />
            <span>Katalog Marketplace</span>
          </router-link>

          <router-link
            to="/revenue"
            class="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition"
          >
            <Wallet class="h-4 w-4" />
            <span>Tarik Saldo</span>
          </router-link>
        </div>
      </div>

      <!-- 2. HIGH-IMPACT INFORMATION-DENSE KPI METRICS (4 CARDS) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: Purchased Assets -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-border-hover transition">
          <div class="flex items-center justify-between text-xs text-text-secondary">
            <span>Aset Dimiliki</span>
            <FolderArchive class="h-4 w-4 text-secondary" />
          </div>
          <div class="font-mono text-3xl font-bold text-text-primary">
            {{ summary.counts.purchasedAssetsCount }}
          </div>
          <div class="flex items-center justify-between text-[11px] text-text-secondary pt-1 border-t border-border/40">
            <span>Total Pengeluaran:</span>
            <strong class="font-mono text-text-primary">{{ formatCurrency(summary.revenue.totalSpent) }}</strong>
          </div>
        </div>

        <!-- Card 2: Creator Listings -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-border-hover transition">
          <div class="flex items-center justify-between text-xs text-text-secondary">
            <span>Katalog Listing</span>
            <Layers class="h-4 w-4 text-primary" />
          </div>
          <div class="font-mono text-3xl font-bold text-text-primary">
            {{ summary.counts.myListings.total }}
          </div>
          <div class="flex items-center gap-2 text-[10px] text-text-secondary pt-1 border-t border-border/40 font-mono">
            <span class="text-success">{{ summary.counts.myListings.approved }} Approved</span>
            <span>•</span>
            <span class="text-amber-400">{{ summary.counts.myListings.pending }} Pending</span>
            <span>•</span>
            <span class="text-red-400">{{ summary.counts.myListings.rejected }} Rejected</span>
          </div>
        </div>

        <!-- Card 3: 60% Creator Earnings -->
        <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg hover:border-border-hover transition">
          <div class="flex items-center justify-between text-xs text-success font-semibold">
            <span>Komisi Bersih (60%)</span>
            <TrendingUp class="h-4 w-4" />
          </div>
          <div class="font-mono text-3xl font-bold text-success">
            {{ formatCurrency(summary.revenue.creatorEarnings) }}
          </div>
          <div class="flex items-center justify-between text-[11px] text-text-secondary pt-1 border-t border-border/40">
            <span>Omset Kotor:</span>
            <span class="font-mono text-text-secondary">{{ formatCurrency(summary.revenue.grossSales) }}</span>
          </div>
        </div>

        <!-- Card 4: Available Balance (Highlight) -->
        <div class="rounded-3xl border border-primary/40 bg-primary/10 p-5 backdrop-blur-md space-y-2 shadow-xl hover:border-primary transition">
          <div class="flex items-center justify-between text-xs text-primary font-bold uppercase tracking-wider">
            <span>Saldo Tersedia</span>
            <Wallet class="h-4 w-4" />
          </div>
          <div class="font-mono text-3xl font-bold text-text-primary">
            {{ formatCurrency(summary.revenue.availableBalance) }}
          </div>
          <div class="flex items-center justify-between text-[11px] text-text-secondary pt-1 border-t border-primary/20">
            <span>Rekening Payout:</span>
            <span :class="summary.bankAccountConfigured ? 'text-success font-semibold' : 'text-amber-400 font-semibold'">
              {{ summary.bankAccountConfigured ? 'Terkonfigurasi' : 'Belum Diatur' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 3. F-PATTERN MAIN CONTENT: LEFT (PRIMARY SCAN PATH) & RIGHT (SIDEBAR WIDGETS) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- LEFT COLUMN: 8 COLS (PRIMARY CONTENT) -->
        <div class="lg:col-span-8 space-y-8">
          <!-- A. RECENT TRANSACTIONS TABLE (F-Pattern Horizontal Bar 1) -->
          <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div class="flex items-center justify-between border-b border-border pb-4">
              <div class="flex items-center gap-2">
                <Receipt class="h-5 w-5 text-secondary" />
                <h3 class="font-heading text-xl font-bold text-text-primary">
                  Aktivitas Transaksi Terbaru
                </h3>
              </div>
              <router-link
                to="/transactions"
                class="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
              >
                <span>Lihat Semua Transaksi</span>
                <ArrowUpRight class="h-3.5 w-3.5" />
              </router-link>
            </div>

            <!-- Empty State -->
            <EmptyState
              v-if="summary.recentTransactions.length === 0"
              compact
              icon="receipt"
              icon-color="muted"
              title="Belum Ada Aktivitas Transaksi"
              description="Catatan riwayat pembelian lisensi atau penjualan karya Anda akan tampil di sini."
              action-text="Jelajahi Aset"
              action-to="/explore"
              action-variant="outline"
            />

            <!-- Table -->
            <div v-else class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    <th class="py-3 px-3">Invoice</th>
                    <th class="py-3 px-3">Peran</th>
                    <th class="py-3 px-3">Aset / Keterangan</th>
                    <th class="py-3 px-3 text-right">Nominal</th>
                    <th class="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr
                    v-for="tx in summary.recentTransactions"
                    :key="tx.id"
                    class="hover:bg-elevated transition"
                  >
                    <td class="py-3 px-3 font-mono font-bold text-text-primary">
                      {{ tx.invoiceNumber }}
                    </td>
                    <td class="py-3 px-3">
                      <span
                        class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                        :class="
                          tx.role === 'seller'
                            ? 'bg-success/15 border border-success/30 text-success'
                            : 'bg-secondary/15 border border-secondary/30 text-secondary'
                        "
                      >
                        {{ tx.role === 'seller' ? 'Penjualan' : 'Pembelian' }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-text-primary truncate max-w-[200px]">
                      {{ tx.title }}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold" :class="tx.role === 'seller' ? 'text-success' : 'text-text-primary'">
                      {{ tx.role === 'seller' ? '+' : '' }}{{ formatCurrency(tx.amount) }}
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
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- B. RECENT LISTINGS (F-Pattern Horizontal Bar 2) -->
          <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-5">
            <div class="flex items-center justify-between border-b border-border pb-4">
              <div class="flex items-center gap-2">
                <Layers class="h-5 w-5 text-primary" />
                <h3 class="font-heading text-xl font-bold text-text-primary">
                  Karya Digital Unggahan Saya
                </h3>
              </div>
              <div class="flex items-center gap-3">
                <router-link
                  to="/upload"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus class="h-3.5 w-3.5" />
                  <span>Tambah Aset</span>
                </router-link>
                <span>•</span>
                <router-link
                  to="/listings"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
                >
                  <span>Kelola Semua</span>
                  <ArrowUpRight class="h-3.5 w-3.5" />
                </router-link>
              </div>
            </div>

            <!-- Empty State -->
            <EmptyState
              v-if="summary.recentListings.length === 0"
              compact
              icon="sparkles"
              icon-color="secondary"
              title="Belum Ada Aset Diunggah"
              description="Publikasikan karya digital Anda ke etalase publik dan nikmati bagi hasil 60% dari setiap penjualan."
              action-text="Upload Karya Pertama"
              action-to="/upload"
              :action-icon="Plus"
            />

            <!-- Grid of Recent Listings -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="item in summary.recentListings"
                :key="item.id"
                class="flex items-start gap-3 rounded-2xl border border-border bg-background p-3.5 hover:border-border-hover transition"
              >
                <img
                  :src="getAssetImageUrl(item.thumbnailUrl)"
                  :alt="item.title"
                  class="h-16 w-16 rounded-xl object-cover border border-border shrink-0"
                  @error="handleImageFallback($event, item.title)"
                />
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-center justify-between gap-1">
                    <span
                      class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      :class="
                        item.status === 'approved'
                          ? 'bg-success/15 text-success border border-success/30'
                          : item.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      "
                    >
                      {{ item.status }}
                    </span>
                    <span class="font-mono text-xs font-bold text-text-primary">
                      {{ formatCurrency(Number(item.price)) }}
                    </span>
                  </div>
                  <router-link
                    :to="`/assets/${item.slug || item.id}`"
                    class="block text-xs font-bold text-text-primary hover:text-primary transition truncate"
                  >
                    {{ item.title }}
                  </router-link>
                  <p class="text-[10px] text-text-secondary font-mono">
                    {{ item.downloadCount }} unduhan • {{ item.assetType.replace('_', ' ') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: 4 COLS (SIDEBAR WIDGETS) -->
        <div class="lg:col-span-4 space-y-6">
          <!-- 1. BANK ACCOUNT STATUS WIDGET -->
          <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md shadow-xl space-y-4">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <CreditCard class="h-4 w-4 text-secondary" />
                <h4 class="font-heading text-lg font-bold text-text-primary">
                  Rekening Payout
                </h4>
              </div>
              <router-link
                to="/settings/payment"
                class="text-[11px] font-semibold text-secondary hover:underline"
              >
                Kelola
              </router-link>
            </div>

            <!-- Configured State -->
            <div v-if="summary.bankAccountConfigured" class="space-y-3">
              <div class="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 space-y-2 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-text-primary">{{ summary.profile.bankName }}</span>
                  <span class="rounded bg-success/20 text-success px-1.5 py-0.5 text-[9px] font-bold">Aktif</span>
                </div>
                <div class="font-mono text-sm tracking-wider font-bold text-text-primary">
                  {{ summary.profile.bankAccountNumber }}
                </div>
                <div class="text-[11px] text-text-secondary">
                  a.n. {{ summary.profile.bankAccountHolder }}
                </div>
              </div>
              <p class="text-[11px] text-text-secondary leading-relaxed">
                Pencairan bagi hasil 60% Anda akan ditransfer langsung ke rekening bank terverifikasi ini.
              </p>
            </div>

            <!-- Not Configured Warning -->
            <div v-else class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3 text-xs">
              <div class="flex items-start gap-2 text-amber-400">
                <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
                <p class="text-[11px] text-amber-300 leading-relaxed">
                  Rekening bank belum diatur. Anda perlu mendaftarkan rekening untuk mencairkan saldo bagi hasil.
                </p>
              </div>
              <router-link
                to="/settings/payment"
                class="block w-full text-center rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition shadow"
              >
                Atur Rekening Sekarang
              </router-link>
            </div>
          </div>

          <!-- 2. MONETIZATION 60/40 TRANSPARENCY CARD -->
          <div class="rounded-3xl border border-secondary/20 bg-secondary/5 p-6 backdrop-blur-md space-y-3 text-xs">
            <div class="flex items-center gap-2 text-secondary font-bold">
              <Building2 class="h-4 w-4" />
              <span>Skema Bagi Hasil 60/40</span>
            </div>
            <p class="text-text-secondary leading-relaxed text-[11px]">
              Setiap kali karya Anda terjual, platform secara instan mengkreditkan <strong>60% ke saldo pendapatan bersih Anda</strong> dan 40% dialokasikan untuk pemeliharaan server dan rekening bersama.
            </p>
            <div class="pt-2 border-t border-secondary/20 flex justify-between text-text-secondary text-[11px]">
              <span>Tingkat Komisi:</span>
              <strong class="text-success font-mono">60% Penjual</strong>
            </div>
          </div>

          <!-- 3. QUICK SHORTCUTS -->
          <div class="rounded-3xl border border-border bg-elevated/60 p-5 space-y-2">
            <h4 class="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              Pintasan Akun
            </h4>
            <router-link
              to="/settings/profile"
              class="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background transition"
            >
              <span>Edit Profil & Bio</span>
              <ExternalLink class="h-3.5 w-3.5" />
            </router-link>
            <router-link
              to="/purchases"
              class="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background transition"
            >
              <span>Pustaka Aset Dimiliki (Downloads)</span>
              <ExternalLink class="h-3.5 w-3.5" />
            </router-link>
            <router-link
              to="/revenue"
              class="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background transition"
            >
              <span>Buku Besar Revenue & Mutasi</span>
              <ExternalLink class="h-3.5 w-3.5" />
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
