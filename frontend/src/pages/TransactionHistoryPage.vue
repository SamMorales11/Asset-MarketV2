<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { userService, type TransactionFullDetail } from '../services/users';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl } from '../utils/imageUrl';
import TableSkeleton from '../components/TableSkeleton.vue';
import StatCardSkeleton from '../components/StatCardSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import Skeleton from '../components/Skeleton.vue';
import UserNav from '../components/UserNav.vue';
import type { UnifiedTransactionItem } from '../types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
  X,
  ShieldCheck,
} from 'lucide-vue-next';

const transactions = ref<UnifiedTransactionItem[]>([]);
const summary = ref({
  totalPurchasesCount: 0,
  totalSalesCount: 0,
  totalSpent: 0,
  totalEarned: 0,
});
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

// Filters
const activeRole = ref<'all' | 'buyer' | 'seller'>('all');
const activeStatus = ref<string>('all');
const searchQuery = ref('');

// Detail Modal state
const isDetailModalOpen = ref(false);
const isDetailLoading = ref(false);
const detailData = ref<TransactionFullDetail | null>(null);
const detailError = ref<string | null>(null);

onMounted(async () => {
  await loadTransactions();
});

async function loadTransactions() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const data = await userService.getMyTransactions({
      role: activeRole.value !== 'all' ? activeRole.value : undefined,
      status: activeStatus.value !== 'all' ? activeStatus.value : undefined,
    });
    transactions.value = data.transactions;
    summary.value = data.summary;
  } catch (err: any) {
    console.error('Failed to load transaction history:', err);
    errorMessage.value = err?.message || 'Gagal memuat riwayat transaksi Anda.';
  } finally {
    isLoading.value = false;
  }
}

async function handleRoleChange(role: 'all' | 'buyer' | 'seller') {
  activeRole.value = role;
  await loadTransactions();
}

async function handleStatusChange() {
  await loadTransactions();
}

const filteredTransactions = computed(() => {
  return transactions.value.filter((item) => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return true;
    return (
      item.invoiceNumber.toLowerCase().includes(query) ||
      item.assetTitle.toLowerCase().includes(query) ||
      item.counterpartyName.toLowerCase().includes(query)
    );
  });
});

async function openTransactionDetail(invoiceOrId: string) {
  isDetailModalOpen.value = true;
  isDetailLoading.value = true;
  detailError.value = null;
  detailData.value = null;

  try {
    detailData.value = await userService.getTransactionDetail(invoiceOrId);
  } catch (err: any) {
    detailError.value = err?.message || 'Gagal mengambil detail rincian transaksi.';
  } finally {
    isDetailLoading.value = false;
  }
}

function closeDetailModal() {
  isDetailModalOpen.value = false;
  detailData.value = null;
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Riwayat Transaksi</span>
    </nav>

    <!-- User Navigation Sub-Header -->
    <UserNav />

    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
            Riwayat Transaksi
          </h1>
          <span class="rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 font-mono text-xs font-bold text-primary">
            {{ summary.totalPurchasesCount + summary.totalSalesCount }} Aktivitas
          </span>
        </div>
        <p class="text-xs text-text-secondary">
          Catatan komprehensif pembelian lisensi aset digital dan penjualan dengan pembagian bagi hasil 60/40.
        </p>
      </div>

      <!-- Quick Link to Revenue -->
      <router-link
        to="/revenue"
        class="inline-flex items-center gap-2 rounded-2xl border border-secondary/30 bg-secondary/10 px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-secondary/20 transition"
      >
        <ShieldCheck class="h-4 w-4" />
        <span>Buku Besar Revenue Kreator</span>
      </router-link>
    </div>

    <!-- METRICS SUMMARY SKELETON -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCardSkeleton v-for="n in 4" :key="n" />
    </div>

    <!-- METRICS SUMMARY (Editorial Luxury Cards) -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Card 1: Pembelian (Buyer) -->
      <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2">
        <div class="flex items-center justify-between text-xs text-text-secondary">
          <span>Total Pembelian Saya</span>
          <ArrowDownLeft class="h-4 w-4 text-secondary" />
        </div>
        <div class="font-mono text-2xl font-bold text-text-primary">
          {{ summary.totalPurchasesCount }} Transaksi
        </div>
        <div class="text-[11px] text-text-secondary">
          Pengeluaran: <strong class="text-text-primary font-mono">{{ formatCurrency(summary.totalSpent) }}</strong>
        </div>
      </div>

      <!-- Card 2: Penjualan (Creator) -->
      <div class="rounded-3xl border border-border bg-elevated/70 p-5 backdrop-blur-md space-y-2">
        <div class="flex items-center justify-between text-xs text-text-secondary">
          <span>Total Penjualan Kreator</span>
          <ArrowUpRight class="h-4 w-4 text-success" />
        </div>
        <div class="font-mono text-2xl font-bold text-text-primary">
          {{ summary.totalSalesCount }} Penjualan
        </div>
        <div class="text-[11px] text-text-secondary">
          Bersih 60%: <strong class="text-success font-mono">+{{ formatCurrency(summary.totalEarned) }}</strong>
        </div>
      </div>

      <!-- Card 3: Model 60/40 -->
      <div class="rounded-3xl border border-secondary/20 bg-secondary/5 p-5 space-y-2 sm:col-span-2">
        <div class="flex items-center gap-2 text-xs font-bold text-secondary">
          <ShieldCheck class="h-4 w-4" />
          <span>Skema Monetisasi Transparan 60/40</span>
        </div>
        <p class="text-xs text-text-secondary leading-relaxed">
          Setiap penjualan aset digital secara otomatis mencatatkan <strong>60% bagi hasil langsung ke saldo kreator</strong> dan 40% dialokasikan untuk pemeliharaan platform escrow.
        </p>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-elevated/60 p-3">
      <!-- Role Tabs -->
      <div class="flex items-center gap-1 rounded-2xl bg-background p-1 border border-border">
        <button
          class="rounded-xl px-4 py-2 text-xs font-semibold transition"
          :class="activeRole === 'all' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'"
          @click="handleRoleChange('all')"
        >
          Semua
        </button>
        <button
          class="rounded-xl px-4 py-2 text-xs font-semibold transition"
          :class="activeRole === 'buyer' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'"
          @click="handleRoleChange('buyer')"
        >
          Pembelian Saya
        </button>
        <button
          class="rounded-xl px-4 py-2 text-xs font-semibold transition"
          :class="activeRole === 'seller' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-text-primary'"
          @click="handleRoleChange('seller')"
        >
          Penjualan Saya
        </button>
      </div>

      <!-- Status Filter & Search -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Status Dropdown -->
        <select
          v-model="activeStatus"
          class="rounded-xl border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
          @change="handleStatusChange"
        >
          <option value="all">Semua Status</option>
          <option value="paid">Paid (Selesai)</option>
          <option value="processing">Processing (Verifikasi)</option>
          <option value="pending">Pending (Menunggu Bayar)</option>
          <option value="rejected">Rejected (Ditolak)</option>
        </select>

        <!-- Search Box -->
        <div class="relative w-56 sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari invoice atau aset..."
            class="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Search class="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
        </div>
      </div>
    </div>

    <!-- LOADING STATE: TABLE SKELETON -->
    <div v-if="isLoading" class="space-y-4">
      <TableSkeleton :columns="7" :rows="6" />
    </div>

    <!-- EMPTY STATE: NO TRANSACTIONS AT ALL -->
    <EmptyState
      v-else-if="transactions.length === 0"
      icon="receipt"
      icon-color="primary"
      title="Belum Ada Transaksi Tercatat"
      description="Riwayat pembelian aset atau transaksi penjualan karya Anda akan tampil di sini secara rinci dan otomatis diperbarui setiap kali terjadi transaksi."
      action-text="Jelajahi Katalog Marketplace"
      action-to="/explore"
    />

    <!-- EMPTY STATE: FILTER SEARCH RETURNED 0 -->
    <EmptyState
      v-else-if="filteredTransactions.length === 0"
      compact
      icon="search"
      icon-color="muted"
      title="Tidak Ada Transaksi yang Cocok"
      description="Tidak ada catatan transaksi yang sesuai dengan filter atau kata kunci pencarian Anda."
      action-text="Reset Filter & Pencarian"
      action-variant="outline"
      @action="searchQuery = ''; activeRole = 'all'; activeStatus = 'all'; loadTransactions();"
    />

    <!-- LUXURY EDITORIAL TRANSACTIONS TABLE (DESKTOP) -->
    <div v-else class="overflow-hidden rounded-3xl border border-border bg-elevated/70 shadow-2xl backdrop-blur-md">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-border bg-elevated-subtle/50 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              <th class="py-4 px-6">Invoice & Tanggal</th>
              <th class="py-4 px-4">Peran</th>
              <th class="py-4 px-4">Aset Terkait</th>
              <th class="py-4 px-4">Pihak Terlibat</th>
              <th class="py-4 px-4 text-right">Nominal</th>
              <th class="py-4 px-4 text-center">Status</th>
              <th class="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="tx in filteredTransactions"
              :key="tx.id"
              class="group hover:bg-elevated/90 transition cursor-pointer"
              @click="openTransactionDetail(tx.invoiceNumber)"
            >
              <!-- Invoice & Date -->
              <td class="py-4 px-6 font-mono">
                <div class="font-bold text-text-primary text-xs group-hover:text-primary transition">
                  {{ tx.invoiceNumber }}
                </div>
                <div class="text-[11px] text-text-secondary mt-0.5">
                  {{ new Date(tx.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' }) }}
                </div>
              </td>

              <!-- Role Pill -->
              <td class="py-4 px-4">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase"
                  :class="
                    tx.role === 'seller'
                      ? 'bg-success/15 border border-success/30 text-success'
                      : 'bg-secondary/15 border border-secondary/30 text-secondary'
                  "
                >
                  {{ tx.role === 'seller' ? 'Penjual' : 'Pembeli' }}
                </span>
              </td>

              <!-- Asset Info -->
              <td class="py-4 px-4 max-w-[240px]">
                <div class="font-heading text-sm font-bold text-text-primary truncate">
                  {{ tx.assetTitle }}
                </div>
                <div class="text-[10px] text-text-secondary uppercase">
                  {{ tx.assetType?.replace('_', ' ') }}
                </div>
              </td>

              <!-- Counterparty -->
              <td class="py-4 px-4 text-text-secondary">
                <span class="text-[10px] block text-text-secondary/70">
                  {{ tx.role === 'buyer' ? 'Penjual:' : 'Pembeli:' }}
                </span>
                <span class="font-bold text-text-primary">{{ tx.counterpartyName }}</span>
              </td>

              <!-- Amount / Split -->
              <td class="py-4 px-4 text-right font-mono">
                <template v-if="tx.role === 'seller'">
                  <div class="text-xs font-bold text-success">
                    +{{ formatCurrency(tx.netAmount) }}
                  </div>
                  <div class="text-[10px] text-text-secondary">
                    (60% dari {{ formatCurrency(tx.grossAmount) }})
                  </div>
                </template>
                <template v-else>
                  <div class="text-xs font-bold text-text-primary">
                    {{ formatCurrency(tx.grossAmount) }}
                  </div>
                </template>
              </td>

              <!-- Status Badge -->
              <td class="py-4 px-4 text-center">
                <span
                  v-if="tx.status === 'paid'"
                  class="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/30 px-2.5 py-0.5 text-[11px] font-bold text-success"
                >
                  <CheckCircle2 class="h-3 w-3" />
                  <span>Paid</span>
                </span>
                <span
                  v-else-if="tx.status === 'processing'"
                  class="inline-flex items-center gap-1 rounded-full bg-secondary/10 border border-secondary/30 px-2.5 py-0.5 text-[11px] font-bold text-secondary"
                >
                  <Clock class="h-3 w-3" />
                  <span>Review</span>
                </span>
                <span
                  v-else-if="tx.status === 'pending'"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400"
                >
                  <Clock class="h-3 w-3" />
                  <span>Pending</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-0.5 text-[11px] font-bold text-red-400"
                >
                  <AlertCircle class="h-3 w-3" />
                  <span>{{ tx.status }}</span>
                </span>
              </td>

              <!-- Action Link -->
              <td class="py-4 px-6 text-right">
                <button
                  class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:border-border-hover transition"
                  @click.stop="openTransactionDetail(tx.invoiceNumber)"
                >
                  <Eye class="h-3.5 w-3.5" />
                  <span>Detail</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL: TRANSACTION FULL DETAIL -->
    <div
      v-if="isDetailModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-2xl rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="rounded bg-primary/15 border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                Detail Transaksi
              </span>
              <span class="font-mono text-xs font-bold text-text-primary">
                {{ detailData?.transaction.invoiceNumber }}
              </span>
            </div>
            <h3 class="font-heading text-2xl font-bold text-text-primary">
              Informasi Faktur & Escrow
            </h3>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="closeDetailModal">
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Loading Skeleton inside Modal -->
        <div v-if="isDetailLoading" class="space-y-6">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-border/50 bg-background/60 p-4">
            <div v-for="i in 4" :key="i" class="space-y-1.5">
              <Skeleton variant="text" width="w-20" height="h-3" rounded="rounded" />
              <Skeleton variant="title" width="w-28" height="h-4" rounded="rounded" />
            </div>
          </div>
          <div class="space-y-3">
            <Skeleton variant="title" width="w-36" height="h-5" rounded="rounded" />
            <div class="space-y-2">
              <div v-for="i in 2" :key="i" class="flex items-center justify-between rounded-2xl border border-border/50 bg-background p-3.5">
                <div class="space-y-1.5">
                  <Skeleton variant="title" width="w-48" height="h-4" rounded="rounded" />
                  <Skeleton variant="text" width="w-32" height="h-3" rounded="rounded" />
                </div>
                <Skeleton variant="title" width="w-20" height="h-4" rounded="rounded" />
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="detailData" class="space-y-6">
          <!-- Meta Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-border bg-background/60 p-4 text-xs">
            <div>
              <span class="text-text-secondary block">Status Transaksi</span>
              <strong class="font-bold text-text-primary uppercase">{{ detailData.transaction.status }}</strong>
            </div>
            <div>
              <span class="text-text-secondary block">Metode Pembayaran</span>
              <strong class="font-bold text-text-primary">Manual Transfer</strong>
            </div>
            <div>
              <span class="text-text-secondary block">Tanggal Dibuat</span>
              <strong class="font-bold text-text-primary">
                {{ new Date(detailData.transaction.createdAt).toLocaleDateString() }}
              </strong>
            </div>
            <div>
              <span class="text-text-secondary block">Total Tagihan</span>
              <strong class="font-bold text-primary font-mono text-sm">
                {{ formatCurrency(detailData.transaction.totalAmount) }}
              </strong>
            </div>
          </div>

          <!-- Items List -->
          <div class="space-y-3">
            <h4 class="font-heading text-lg font-bold text-text-primary">Rincian Item Digital</h4>
            <div class="space-y-2">
              <div
                v-for="item in detailData.items"
                :key="item.id"
                class="flex items-center justify-between rounded-2xl border border-border bg-background p-3.5 text-xs"
              >
                <div>
                  <h5 class="font-bold text-text-primary">{{ item.asset.title }}</h5>
                  <p class="text-[11px] text-text-secondary">
                    Kreator: {{ item.seller.name }} • Lisensi Komersial Standar
                  </p>
                </div>

                <div class="text-right font-mono">
                  <div class="font-bold text-text-primary">{{ formatCurrency(item.price) }}</div>
                  <div v-if="detailData.isSeller" class="text-[10px] text-success">
                    Bagi Hasil Kreator (60%): +{{ formatCurrency(item.sellerAmount) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 60/40 Split Breakdown (If User is Seller) -->
          <div v-if="detailData.isSeller" class="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 space-y-2 text-xs">
            <h4 class="font-bold text-secondary flex items-center gap-1.5">
              <ShieldCheck class="h-4 w-4" />
              <span>Rincian Pembagian Hasil Transaksi (60/40 Split)</span>
            </h4>
            <div class="flex justify-between text-text-secondary">
              <span>Pendapatan Bersih Penjual (60%)</span>
              <span class="font-mono text-success font-bold">
                {{ formatCurrency(detailData.items.reduce((s, i) => s + i.sellerAmount, 0)) }}
              </span>
            </div>
            <div class="flex justify-between text-text-secondary">
              <span>Komisi Platform Pemeliharaan (40%)</span>
              <span class="font-mono text-text-secondary">
                {{ formatCurrency(detailData.items.reduce((s, i) => s + i.platformAmount, 0)) }}
              </span>
            </div>
          </div>

          <!-- Payment Proof Preview (If Available) -->
          <div v-if="detailData.paymentConfirmation" class="rounded-2xl border border-border bg-background p-4 space-y-3 text-xs">
            <h4 class="font-bold text-text-primary">Data Pengiriman Bukti Transfer</h4>
            <div class="grid grid-cols-2 gap-2 text-text-secondary">
              <div>Bank Pengirim: <strong class="text-text-primary">{{ detailData.paymentConfirmation.senderBank }}</strong></div>
              <div>Rekening: <strong class="text-text-primary">{{ detailData.paymentConfirmation.senderAccountNumber }}</strong></div>
              <div>Pengirim: <strong class="text-text-primary">{{ detailData.paymentConfirmation.senderAccountName }}</strong></div>
              <div>Tujuan: <strong class="text-text-primary">{{ detailData.paymentConfirmation.destinationBank }} (PT ASSET MARKET)</strong></div>
            </div>
            <div v-if="detailData.paymentConfirmation.proofImageUrl" class="pt-2">
              <div class="text-[11px] font-semibold text-text-secondary mb-1.5 flex items-center gap-1.5">
                <Eye class="h-3.5 w-3.5 text-secondary" />
                <span>Foto Resi Bukti Transfer</span>
              </div>
              <div class="rounded-xl overflow-hidden border border-border bg-elevated/80 p-2 max-w-sm">
                <img
                  :src="getAssetImageUrl(detailData.paymentConfirmation.proofImageUrl)"
                  alt="Resi Bukti Transfer"
                  class="w-full max-h-56 object-contain rounded-lg"
                />
              </div>
            </div>
          </div>

          <!-- Modal Footer CTA -->
          <div class="flex items-center justify-between pt-2 border-t border-border">
            <router-link
              :to="`/transactions/${detailData.transaction.invoiceNumber}`"
              class="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
            >
              <span>Buka Halaman Status Publik</span>
              <ExternalLink class="h-3 w-3" />
            </router-link>

            <button
              class="rounded-xl border border-border px-5 py-2 text-xs font-semibold text-text-primary hover:bg-elevated transition"
              @click="closeDetailModal"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
