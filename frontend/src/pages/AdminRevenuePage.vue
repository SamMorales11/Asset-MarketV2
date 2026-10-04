<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminService } from '../services/admin';
import { formatCurrency } from '../utils/formatters';
import type { AdminRevenueResponse, AdminUserRevenueDetail } from '../types';
import AdminNav from '../components/AdminNav.vue';
import StatCardSkeleton from '../components/StatCardSkeleton.vue';
import TableSkeleton from '../components/TableSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import {
  Coins,
  Search,
  DollarSign,
  Wallet,
  TrendingUp,
  Building2,
  Eye,
  Loader2,
  X,
  ShieldCheck,
  Receipt,
} from 'lucide-vue-next';

const revenueData = ref<AdminRevenueResponse | null>(null);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const searchQuery = ref('');

// Detail Modal
const isDetailModalOpen = ref(false);
const detailLoading = ref(false);
const selectedSellerDetail = ref<AdminUserRevenueDetail | null>(null);

onMounted(async () => {
  await loadRevenue();
});

async function loadRevenue() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const data = await adminService.getUsersRevenue(searchQuery.value.trim() || undefined);
    revenueData.value = data;
  } catch (err: any) {
    console.error('Failed to load admin revenue:', err);
    errorMessage.value = err?.message || 'Gagal memuat laporan revenue kreator.';
  } finally {
    isLoading.value = false;
  }
}

function handleSearch() {
  loadRevenue();
}

async function openSellerDetail(userId: string) {
  isDetailModalOpen.value = true;
  detailLoading.value = true;
  selectedSellerDetail.value = null;
  try {
    selectedSellerDetail.value = await adminService.getUserRevenueDetail(userId);
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal memuat rincian revenue kreator.';
  } finally {
    detailLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <router-link to="/admin" class="hover:text-text-primary transition">Admin</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">User Revenue</span>
    </nav>

    <!-- Admin Nav -->
    <AdminNav />

    <!-- Page Header -->
    <div class="mb-8 border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <Coins class="h-4 w-4" />
          <span>Creator Monetization & 60/40 Split</span>
        </div>
        <h1 class="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
          Laporan Pendapatan & Revenue Pengguna
        </h1>
        <p class="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
          Audit transparansi pembagian hasil 60% untuk penjual dan 40% pemeliharaan escrow platform secara menyeluruh per kreator.
        </p>
      </div>

      <div class="flex items-center gap-2 text-xs text-text-secondary">
        <ShieldCheck class="h-4 w-4 text-secondary" />
        <span>Sistem Skema 60/40 Otomatis</span>
      </div>
    </div>

    <!-- ERROR STATE -->
    <div
      v-if="errorMessage"
      class="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400"
    >
      {{ errorMessage }}
    </div>

    <!-- 1. HIGH-LEVEL PLATFORM SUMMARY METRIC CARDS -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCardSkeleton v-for="n in 4" :key="n" />
    </div>
    <div v-else-if="revenueData" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Card 1: Total Platform 40% -->
      <div class="rounded-3xl border border-secondary/30 bg-secondary/10 p-5 backdrop-blur-md space-y-2 shadow-lg">
        <div class="flex items-center justify-between text-xs text-secondary font-bold uppercase tracking-wider">
          <span>Fee Platform (40%)</span>
          <DollarSign class="h-4 w-4" />
        </div>
        <div class="font-mono text-2xl sm:text-3xl font-bold text-secondary pt-1 truncate">
          {{ formatCurrency(revenueData.summary.totalPlatformRevenue) }}
        </div>
        <p class="text-[11px] text-text-secondary">
          Akumulasi pendapatan bersih platform.
        </p>
      </div>

      <!-- Card 2: Creator Net 60% -->
      <div class="rounded-3xl border border-success/30 bg-success/10 p-5 backdrop-blur-md space-y-2 shadow-lg">
        <div class="flex items-center justify-between text-xs text-success font-bold uppercase tracking-wider">
          <span>Bagi Hasil Kreator (60%)</span>
          <Wallet class="h-4 w-4" />
        </div>
        <div class="font-mono text-2xl sm:text-3xl font-bold text-success pt-1 truncate">
          {{ formatCurrency(revenueData.summary.totalCreatorEarnings) }}
        </div>
        <p class="text-[11px] text-text-secondary">
          Total hak pendapatan seluruh penjual.
        </p>
      </div>

      <!-- Card 3: Total Gross GMV -->
      <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg">
        <div class="flex items-center justify-between text-xs text-text-secondary font-bold uppercase tracking-wider">
          <span>Total Omset GMV (100%)</span>
          <TrendingUp class="h-4 w-4 text-primary" />
        </div>
        <div class="font-mono text-2xl sm:text-3xl font-bold text-text-primary pt-1 truncate">
          {{ formatCurrency(revenueData.summary.totalGrossSales) }}
        </div>
        <p class="text-[11px] text-text-secondary">
          Total omset transaksi digital yang berhasil.
        </p>
      </div>

      <!-- Card 4: Total Withdrawn All -->
      <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2 shadow-lg">
        <div class="flex items-center justify-between text-xs text-text-secondary font-bold uppercase tracking-wider">
          <span>Total Dicairkan (Payouts)</span>
          <Building2 class="h-4 w-4 text-text-secondary" />
        </div>
        <div class="font-mono text-2xl sm:text-3xl font-bold text-text-primary pt-1 truncate">
          {{ formatCurrency(revenueData.summary.totalWithdrawnAll) }}
        </div>
        <p class="text-[11px] text-text-secondary">
          Akumulasi dana yang telah ditransfer ke bank kreator.
        </p>
      </div>
    </div>

    <!-- 2. SEARCH BAR -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-elevated/70 p-3.5 backdrop-blur-md">
      <div class="relative w-full sm:w-80">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau email kreator..."
          class="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          @keyup.enter="handleSearch"
        />
        <Search class="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
      </div>

      <button
        class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover transition shadow"
        @click="handleSearch"
      >
        Filter Kreator
      </button>
    </div>

    <!-- LOADING STATE: TABLE SKELETON -->
    <div v-if="isLoading" class="space-y-4">
      <TableSkeleton :columns="8" :rows="5" />
    </div>

    <!-- EMPTY STATE -->
    <EmptyState
      v-else-if="revenueData && revenueData.sellers.length === 0"
      compact
      icon="receipt"
      icon-color="muted"
      title="Tidak Ada Data Penjual"
      description="Tidak ditemukan kreator atau catatan transaksi yang sesuai dengan kata kunci pencarian Anda."
      action-text="Reset Pencarian"
      action-variant="outline"
      @action="searchQuery = ''; loadRevenue();"
    />

    <!-- SELLERS REVENUE TABLE (HIGH INFORMATION DENSITY) -->
    <div v-else-if="revenueData" class="overflow-hidden rounded-3xl border border-border bg-elevated/80 shadow-2xl backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-border bg-elevated-subtle/50 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              <th class="py-4 px-5">Kreator Penjual</th>
              <th class="py-4 px-3">Rekening Payout</th>
              <th class="py-4 px-3 text-center">Aset & Penjualan</th>
              <th class="py-4 px-3 text-right">Omset (100%)</th>
              <th class="py-4 px-3 text-right">Kreator (60%)</th>
              <th class="py-4 px-3 text-right">Platform (40%)</th>
              <th class="py-4 px-3 text-right">Saldo Tersedia</th>
              <th class="py-4 px-5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr
              v-for="seller in revenueData.sellers"
              :key="seller.user.id"
              class="hover:bg-elevated/90 transition cursor-pointer"
              @click="openSellerDetail(seller.user.id)"
            >
              <!-- Creator Name -->
              <td class="py-4 px-5">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-secondary/30 to-elevated-subtle border border-secondary/30 text-xs font-bold text-text-primary">
                    {{ seller.user.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-text-primary truncate">{{ seller.user.name }}</p>
                    <p class="text-[11px] text-text-secondary font-mono truncate">{{ seller.user.email }}</p>
                  </div>
                </div>
              </td>

              <!-- Bank Status -->
              <td class="py-4 px-3">
                <div v-if="seller.bankConfigured" class="space-y-0.5">
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold text-text-primary">
                    <Building2 class="h-3 w-3 text-secondary" />
                    <span>{{ seller.user.bankName }}</span>
                  </span>
                  <p class="text-[10px] text-text-secondary font-mono">{{ seller.user.bankAccountNumber }}</p>
                </div>
                <span v-else class="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[9px] font-bold">
                  Belum Diatur
                </span>
              </td>

              <!-- Assets & Sales -->
              <td class="py-4 px-3 text-center">
                <div class="text-[10px] font-mono text-text-secondary">
                  <span>{{ seller.assetsCount }} Aset</span> •
                  <strong class="text-text-primary">{{ seller.totalSalesCount }} Terjual</strong>
                </div>
              </td>

              <!-- Gross Sales 100% -->
              <td class="py-4 px-3 text-right font-mono font-bold text-text-primary">
                {{ formatCurrency(seller.grossSales) }}
              </td>

              <!-- Creator Net 60% -->
              <td class="py-4 px-3 text-right font-mono font-bold text-success">
                +{{ formatCurrency(seller.creatorEarnings) }}
              </td>

              <!-- Platform 40% -->
              <td class="py-4 px-3 text-right font-mono text-secondary font-semibold">
                {{ formatCurrency(seller.platformShareGenerated) }}
              </td>

              <!-- Available Balance -->
              <td class="py-4 px-3 text-right font-mono font-bold" :class="seller.availableBalance > 0 ? 'text-primary' : 'text-text-secondary'">
                {{ formatCurrency(seller.availableBalance) }}
              </td>

              <!-- Action Link -->
              <td class="py-4 px-5 text-right">
                <button
                  class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:border-border-hover transition"
                  @click.stop="openSellerDetail(seller.user.id)"
                >
                  <Eye class="h-3 w-3" />
                  <span>Detail</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: SELLER REVENUE DETAIL BREAKDOWN -->
    <div
      v-if="isDetailModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-2xl rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="rounded bg-secondary/15 border border-secondary/30 px-2 py-0.5 text-[10px] font-bold uppercase text-secondary">
                Rincian Revenue Kreator
              </span>
              <span class="font-bold text-xs text-text-primary">
                {{ selectedSellerDetail?.user.name }}
              </span>
            </div>
            <h3 class="font-heading text-2xl font-bold text-text-primary">
              Bagi Hasil 60/40 & Mutasi Saldo
            </h3>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="isDetailModalOpen = false">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="detailLoading" class="py-12 text-center">
          <Loader2 class="mx-auto h-8 w-8 text-primary animate-spin mb-2" />
          <p class="text-xs text-text-secondary">Mengambil riwayat transaksi kreator...</p>
        </div>

        <div v-else-if="selectedSellerDetail" class="space-y-6 text-xs">
          <!-- 4 Financial Stat Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Omset Kotor</span>
              <strong class="font-mono font-bold text-text-primary">
                {{ formatCurrency(selectedSellerDetail.financials.grossSales) }}
              </strong>
            </div>
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Hak Bersih 60%</span>
              <strong class="font-mono font-bold text-success">
                {{ formatCurrency(selectedSellerDetail.financials.creatorEarnings) }}
              </strong>
            </div>
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Platform 40%</span>
              <strong class="font-mono font-bold text-secondary">
                {{ formatCurrency(selectedSellerDetail.financials.platformShareGenerated) }}
              </strong>
            </div>
            <div class="rounded-2xl border border-border bg-background p-3 space-y-1">
              <span class="text-text-secondary block">Saldo Tersedia</span>
              <strong class="font-mono font-bold text-primary">
                {{ formatCurrency(selectedSellerDetail.financials.availableBalance) }}
              </strong>
            </div>
          </div>

          <!-- Bank Account Box -->
          <div class="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 space-y-2">
            <div class="flex items-center gap-2 font-bold text-secondary">
              <Building2 class="h-4 w-4" />
              <span>Rekening Payout Tujuan Transfer</span>
            </div>
            <div v-if="selectedSellerDetail.user.bankAccountNumber" class="grid grid-cols-2 gap-2 text-text-secondary">
              <div>Bank: <strong class="text-text-primary">{{ selectedSellerDetail.user.bankName }}</strong></div>
              <div>No Rekening: <strong class="text-text-primary font-mono">{{ selectedSellerDetail.user.bankAccountNumber }}</strong></div>
              <div>Nama Pemilik: <strong class="text-text-primary">{{ selectedSellerDetail.user.bankAccountHolder }}</strong></div>
              <div>Status: <span class="text-success font-semibold">Tervalidasi Escrow</span></div>
            </div>
            <div v-else class="text-amber-400">
              Kreator belum mendaftarkan nomor rekening bank untuk payout.
            </div>
          </div>

          <!-- Itemized Sales List -->
          <div class="space-y-3">
            <h4 class="font-bold text-text-primary flex items-center gap-1.5">
              <Receipt class="h-4 w-4 text-text-secondary" />
              <span>Riwayat Item Terjual ({{ selectedSellerDetail.sales.length }})</span>
            </h4>

            <div v-if="selectedSellerDetail.sales.length === 0" class="text-text-secondary italic">
              Belum ada catatan aset terjual.
            </div>

            <div v-else class="space-y-2 max-h-48 overflow-y-auto pr-1">
              <div
                v-for="item in selectedSellerDetail.sales"
                :key="item.id"
                class="flex items-center justify-between rounded-xl border border-border bg-background p-3"
              >
                <div>
                  <p class="font-bold text-text-primary">{{ item.assetTitle }}</p>
                  <p class="text-[10px] text-text-secondary font-mono">Invoice: {{ item.invoiceNumber }}</p>
                </div>
                <div class="text-right font-mono">
                  <div class="font-bold text-text-primary">{{ formatCurrency(Number(item.price)) }}</div>
                  <div class="text-[10px] text-success font-semibold">
                    60%: +{{ formatCurrency(Number(item.sellerAmount)) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="flex items-center justify-end pt-3 border-t border-border">
            <button
              class="rounded-xl bg-elevated border border-border px-5 py-2 text-xs font-semibold text-text-primary hover:bg-elevated-subtle transition"
              @click="isDetailModalOpen = false"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
