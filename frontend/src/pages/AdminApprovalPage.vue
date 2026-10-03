<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { assetService, type PendingAssetWithFiles } from '../services/assets';
import { adminPaymentService, type AdminPendingPaymentItem } from '../services/transactions';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback, getLuxuryPlaceholder } from '../utils/imageUrl';
import { useToast } from '../composables/useToast';
import AdminNav from '../components/AdminNav.vue';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
  FolderCheck,
  X,
  Check,
  Eye,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
} from 'lucide-vue-next';

const { toast } = useToast();

// Active Tab: 'assets' | 'payments'
const activeTab = ref<'assets' | 'payments'>('assets');

// Asset Moderation Queue
const pendingAssets = ref<PendingAssetWithFiles[]>([]);
const isAssetsLoading = ref(true);

// Payment Moderation Queue
const pendingPayments = ref<AdminPendingPaymentItem[]>([]);
const isPaymentsLoading = ref(true);

// Filters for Assets
const assetSearch = ref('');
const assetTypeFilter = ref('all');
const assetSort = ref<'newest' | 'price-asc' | 'price-desc'>('newest');

// Filters for Payments
const paymentSearch = ref('');

// Bulk Selection States
const selectedAssetIds = ref<string[]>([]);
const selectedPaymentIds = ref<string[]>([]);
const isBulkActionLoading = ref(false);

// Modal state for single asset rejection
const isRejectModalOpen = ref(false);
const selectedAsset = ref<PendingAssetWithFiles | null>(null);
const rejectionReason = ref('');
const isActionLoading = ref(false);

// Modal state for bulk asset rejection
const isBulkRejectModalOpen = ref(false);
const bulkRejectionReason = ref('');

// Modal state for payment inspection & rejection

function resolveAdminAssetImage(asset: PendingAssetWithFiles): string {
  const raw =
    (asset as any).thumbnailUrl ||
    (asset as any).thumbnail ||
    (asset as any).thumbnail_url ||
    (asset as any).coverUrl ||
    (asset as any).cover_url;
  if (!raw) return getLuxuryPlaceholder(asset.title, (asset as any).category?.name || asset.assetType);
  return getAssetImageUrl(raw);
}
const inspectingPayment = ref<AdminPendingPaymentItem | null>(null);
const isPaymentRejectModalOpen = ref(false);
const selectedPayment = ref<AdminPendingPaymentItem | null>(null);
const paymentRejectReason = ref('');

onMounted(async () => {
  await Promise.all([loadPendingAssets(), loadPendingPayments()]);
});

async function loadPendingAssets() {
  isAssetsLoading.value = true;
  try {
    pendingAssets.value = await assetService.getPendingAssets();
    // Clean up selected IDs that no longer exist
    selectedAssetIds.value = selectedAssetIds.value.filter((id) =>
      pendingAssets.value.some((a) => a.id === id)
    );
  } catch (err: any) {
    console.error('Error loading pending assets:', err);
    toast.error('Gagal Memuat Antrean Aset', err?.message);
  } finally {
    isAssetsLoading.value = false;
  }
}

async function loadPendingPayments() {
  isPaymentsLoading.value = true;
  try {
    pendingPayments.value = await adminPaymentService.getPendingPayments();
    selectedPaymentIds.value = selectedPaymentIds.value.filter((id) =>
      pendingPayments.value.some((p) => p.id === id)
    );
  } catch (err: any) {
    console.error('Error loading pending payments:', err);
    toast.error('Gagal Memuat Antrean Pembayaran', err?.message);
  } finally {
    isPaymentsLoading.value = false;
  }
}

// -------------------------------------------------------------
// FILTERED COMPUTED PROPERTIES
// -------------------------------------------------------------
const filteredAssets = computed(() => {
  return pendingAssets.value
    .filter((a) => {
      const q = assetSearch.value.trim().toLowerCase();
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        (a.seller?.name && a.seller.name.toLowerCase().includes(q)) ||
        (a.seller?.email && a.seller.email.toLowerCase().includes(q)) ||
        (a.category?.name && a.category.name.toLowerCase().includes(q));

      const matchesType =
        assetTypeFilter.value === 'all' || a.assetType === assetTypeFilter.value;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (assetSort.value === 'price-asc') return Number(a.price) - Number(b.price);
      if (assetSort.value === 'price-desc') return Number(b.price) - Number(a.price);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
});

const filteredPayments = computed(() => {
  return pendingPayments.value.filter((p) => {
    const q = paymentSearch.value.trim().toLowerCase();
    return (
      !q ||
      p.transaction.invoiceNumber.toLowerCase().includes(q) ||
      p.buyer.name.toLowerCase().includes(q) ||
      p.buyer.email.toLowerCase().includes(q) ||
      p.senderAccountName.toLowerCase().includes(q) ||
      p.destinationBank.toLowerCase().includes(q)
    );
  });
});

// -------------------------------------------------------------
// BULK SELECTION HELPERS
// -------------------------------------------------------------
const isAllAssetsSelected = computed(() => {
  return (
    filteredAssets.value.length > 0 &&
    filteredAssets.value.every((a) => selectedAssetIds.value.includes(a.id))
  );
});

function toggleAllAssets() {
  if (isAllAssetsSelected.value) {
    const currentIds = new Set(filteredAssets.value.map((a) => a.id));
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => !currentIds.has(id));
  } else {
    const combined = new Set([
      ...selectedAssetIds.value,
      ...filteredAssets.value.map((a) => a.id),
    ]);
    selectedAssetIds.value = Array.from(combined);
  }
}

function toggleAssetSelect(id: string) {
  const index = selectedAssetIds.value.indexOf(id);
  if (index === -1) {
    selectedAssetIds.value.push(id);
  } else {
    selectedAssetIds.value.splice(index, 1);
  }
}

const isAllPaymentsSelected = computed(() => {
  return (
    filteredPayments.value.length > 0 &&
    filteredPayments.value.every((p) => selectedPaymentIds.value.includes(p.id))
  );
});

function toggleAllPayments() {
  if (isAllPaymentsSelected.value) {
    const currentIds = new Set(filteredPayments.value.map((p) => p.id));
    selectedPaymentIds.value = selectedPaymentIds.value.filter((id) => !currentIds.has(id));
  } else {
    const combined = new Set([
      ...selectedPaymentIds.value,
      ...filteredPayments.value.map((p) => p.id),
    ]);
    selectedPaymentIds.value = Array.from(combined);
  }
}

function togglePaymentSelect(id: string) {
  const index = selectedPaymentIds.value.indexOf(id);
  if (index === -1) {
    selectedPaymentIds.value.push(id);
  } else {
    selectedPaymentIds.value.splice(index, 1);
  }
}

const totalSelectedPaymentsAmount = computed(() => {
  return pendingPayments.value
    .filter((p) => selectedPaymentIds.value.includes(p.id))
    .reduce((sum, p) => sum + Number(p.transferAmount), 0);
});

// -------------------------------------------------------------
// SINGLE ASSET ACTIONS
// -------------------------------------------------------------
async function handleApproveAsset(asset: PendingAssetWithFiles) {
  if (!confirm(`Setujui aset "${asset.title}" untuk tayang publik di marketplace?`)) {
    return;
  }

  isActionLoading.value = true;
  try {
    await assetService.approveAsset(asset.id);
    pendingAssets.value = pendingAssets.value.filter((a) => a.id !== asset.id);
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => id !== asset.id);
    toast.success(
      'Aset Disetujui & Live!',
      `Aset "${asset.title}" kini telah aktif dan dapat dibeli publik di marketplace.`
    );
  } catch (err: any) {
    const errorText = err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem.';
    toast.error('Gagal Menyetujui Aset', errorText);
  } finally {
    isActionLoading.value = false;
  }
}

function openRejectModal(asset: PendingAssetWithFiles) {
  selectedAsset.value = asset;
  rejectionReason.value = '';
  isRejectModalOpen.value = true;
}

function closeRejectModal() {
  isRejectModalOpen.value = false;
  selectedAsset.value = null;
  rejectionReason.value = '';
}

async function submitReject() {
  if (!selectedAsset.value) return;
  if (!rejectionReason.value.trim() || rejectionReason.value.length < 5) {
    toast.warning('Alasan Diperlukan', 'Harap masukkan alasan penolakan yang jelas (minimal 5 karakter).');
    return;
  }

  const assetName = selectedAsset.value.title;
  const reasonText = rejectionReason.value.trim();

  isActionLoading.value = true;
  try {
    await assetService.rejectAsset(selectedAsset.value.id, reasonText);
    pendingAssets.value = pendingAssets.value.filter((a) => a.id !== selectedAsset.value?.id);
    selectedAssetIds.value = selectedAssetIds.value.filter((id) => id !== selectedAsset.value?.id);
    closeRejectModal();
    toast.error(
      'Aset Ditolak',
      `Aset "${assetName}" telah ditolak dengan catatan kurasi: "${reasonText}".`
    );
  } catch (err: any) {
    const errorText = err?.response?.data?.message || err?.message || 'Terjadi kesalahan.';
    toast.error('Gagal Menolak Aset', errorText);
  } finally {
    isActionLoading.value = false;
  }
}

// -------------------------------------------------------------
// BULK ASSET ACTIONS
// -------------------------------------------------------------
async function handleBulkApproveAssets() {
  const count = selectedAssetIds.value.length;
  if (count === 0) return;

  if (!confirm(`Konfirmasi setujui dan publikasikan ${count} aset sekaligus?`)) {
    return;
  }

  isBulkActionLoading.value = true;
  const targetIds = [...selectedAssetIds.value];
  let successCount = 0;

  for (const id of targetIds) {
    try {
      await assetService.approveAsset(id);
      successCount++;
    } catch (e) {
      console.warn(`Failed to approve asset ${id}:`, e);
    }
  }

  pendingAssets.value = pendingAssets.value.filter((a) => !targetIds.includes(a.id));
  selectedAssetIds.value = [];
  isBulkActionLoading.value = false;

  toast.success(
    'Bulk Approve Berhasil!',
    `${successCount} dari ${count} aset berhasil disetujui dan langsung tayang publik.`
  );
}

function openBulkRejectModal() {
  if (selectedAssetIds.value.length === 0) return;
  bulkRejectionReason.value = '';
  isBulkRejectModalOpen.value = true;
}

async function submitBulkReject() {
  const count = selectedAssetIds.value.length;
  if (count === 0) return;

  if (!bulkRejectionReason.value.trim() || bulkRejectionReason.value.length < 5) {
    toast.warning('Alasan Diperlukan', 'Harap masukkan alasan penolakan bersama (minimal 5 karakter).');
    return;
  }

  isBulkActionLoading.value = true;
  const targetIds = [...selectedAssetIds.value];
  const reasonText = bulkRejectionReason.value.trim();
  let successCount = 0;

  for (const id of targetIds) {
    try {
      await assetService.rejectAsset(id, reasonText);
      successCount++;
    } catch (e) {
      console.warn(`Failed to reject asset ${id}:`, e);
    }
  }

  pendingAssets.value = pendingAssets.value.filter((a) => !targetIds.includes(a.id));
  selectedAssetIds.value = [];
  isBulkRejectModalOpen.value = false;
  isBulkActionLoading.value = false;

  toast.error(
    'Bulk Reject Selesai',
    `${successCount} dari ${count} aset ditolak dengan alasan: "${reasonText}".`
  );
}

// -------------------------------------------------------------
// PAYMENT VERIFICATION & BULK ACTIONS
// -------------------------------------------------------------
async function handleVerifyPayment(payment: AdminPendingPaymentItem) {
  if (
    !confirm(
      `Verifikasi pembayaran untuk Invoice ${payment.transaction.invoiceNumber} senilai ${formatCurrency(
        payment.transferAmount
      )}?\n\nTindakan ini akan:\n1. Membuka akses unduhan deliverable bagi pembeli (${payment.buyer.name})\n2. Mencatat pendapatan bagi hasil 60% ke saldo penjual.`
    )
  ) {
    return;
  }

  isActionLoading.value = true;
  try {
    await adminPaymentService.verifyPayment(payment.id);
    pendingPayments.value = pendingPayments.value.filter((p) => p.id !== payment.id);
    selectedPaymentIds.value = selectedPaymentIds.value.filter((id) => id !== payment.id);
    if (inspectingPayment.value?.id === payment.id) {
      inspectingPayment.value = null;
    }
    toast.success(
      'Pembayaran Terverifikasi!',
      `Invoice ${payment.transaction.invoiceNumber} senilai ${formatCurrency(
        payment.transferAmount
      )} berhasil diverifikasi. Aset telah aktif di My Assets pembeli dan komisi 60/40 telah dicatat.`
    );
  } catch (err: any) {
    toast.error('Gagal Memverifikasi Pembayaran', err?.message);
  } finally {
    isActionLoading.value = false;
  }
}

async function handleBulkVerifyPayments() {
  const count = selectedPaymentIds.value.length;
  if (count === 0) return;

  if (
    !confirm(
      `Konfirmasi verifikasi ${count} pembayaran sekaligus dengan total transfer ${formatCurrency(
        totalSelectedPaymentsAmount.value
      )}?`
    )
  ) {
    return;
  }

  isBulkActionLoading.value = true;
  const targetIds = [...selectedPaymentIds.value];
  let successCount = 0;

  for (const id of targetIds) {
    try {
      await adminPaymentService.verifyPayment(id);
      successCount++;
    } catch (e) {
      console.warn(`Failed to verify payment ${id}:`, e);
    }
  }

  pendingPayments.value = pendingPayments.value.filter((p) => !targetIds.includes(p.id));
  selectedPaymentIds.value = [];
  isBulkActionLoading.value = false;

  toast.success(
    'Bulk Verifikasi Berhasil!',
    `${successCount} pembayaran telah terverifikasi penuh dan hak akses aset telah diserahkan ke pembeli.`
  );
}

function openPaymentRejectModal(payment: AdminPendingPaymentItem) {
  selectedPayment.value = payment;
  paymentRejectReason.value = '';
  isPaymentRejectModalOpen.value = true;
}

function closePaymentRejectModal() {
  isPaymentRejectModalOpen.value = false;
  selectedPayment.value = null;
  paymentRejectReason.value = '';
}

async function submitPaymentReject() {
  if (!selectedPayment.value) return;
  if (!paymentRejectReason.value.trim() || paymentRejectReason.value.length < 5) {
    toast.warning('Alasan Diperlukan', 'Harap masukkan alasan penolakan yang jelas (minimal 5 karakter).');
    return;
  }

  const invoice = selectedPayment.value.transaction.invoiceNumber;
  const reasonText = paymentRejectReason.value.trim();

  isActionLoading.value = true;
  try {
    await adminPaymentService.rejectPayment(selectedPayment.value.id, reasonText);
    pendingPayments.value = pendingPayments.value.filter((p) => p.id !== selectedPayment.value?.id);
    selectedPaymentIds.value = selectedPaymentIds.value.filter((id) => id !== selectedPayment.value?.id);
    closePaymentRejectModal();
    if (inspectingPayment.value?.id === selectedPayment.value.id) {
      inspectingPayment.value = null;
    }
    toast.error(
      'Pembayaran Ditolak',
      `Bukti transfer untuk Invoice ${invoice} ditolak dengan alasan: "${reasonText}".`
    );
  } catch (err: any) {
    toast.error('Gagal Menolak Pembayaran', err?.message);
  } finally {
    isActionLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Admin Navigation Bar -->
    <AdminNav />

    <!-- Page Header & Tab Bar -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
          <ShieldAlert class="h-3.5 w-3.5" />
          <span>Curator & Escrow Desk</span>
        </div>
        <h1 class="font-heading text-4xl sm:text-5xl font-bold text-text-primary">
          Moderation & Escrow Review
        </h1>
        <p class="mt-2 text-xs sm:text-sm text-text-secondary">
          Tinjau publikasi aset baru, validasi transfer manual, dan kelola bagi hasil 60/40 kreator.
        </p>
      </div>

      <!-- Tab Switcher -->
      <div class="flex items-center rounded-2xl border border-border bg-elevated p-1 shadow-sm shrink-0">
        <button
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition"
          :class="
            activeTab === 'assets'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary'
          "
          @click="activeTab = 'assets'"
        >
          <span>Antrean Aset</span>
          <span
            class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
            :class="activeTab === 'assets' ? 'bg-white/20 text-white' : 'bg-border text-text-secondary'"
          >
            {{ pendingAssets.length }}
          </span>
        </button>

        <button
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition"
          :class="
            activeTab === 'payments'
              ? 'bg-primary text-white shadow-md'
              : 'text-text-secondary hover:text-text-primary'
          "
          @click="activeTab = 'payments'"
        >
          <span>Verifikasi Transfer</span>
          <span
            class="rounded-full px-1.5 py-0.2 text-[10px] font-bold"
            :class="activeTab === 'payments' ? 'bg-white/20 text-white' : 'bg-secondary/20 text-secondary'"
          >
            {{ pendingPayments.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 1: ASSET APPROVALS -->
    <!-- ======================================================== -->
    <div v-if="activeTab === 'assets'" class="space-y-6">
      <!-- Filter & Search Toolbar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border bg-elevated/70 p-3 backdrop-blur-md">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            v-model="assetSearch"
            type="text"
            placeholder="Cari judul aset, nama penjual, email, atau kategori..."
            class="w-full rounded-xl border border-border bg-background/80 pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Type Filter -->
          <div class="relative">
            <select
              v-model="assetTypeFilter"
              class="appearance-none rounded-xl border border-border bg-background/80 px-3 py-2 pr-8 text-xs font-medium text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="all">Semua Tipe Aset</option>
              <option value="ui_template">UI Template</option>
              <option value="source_code">Source Code</option>
              <option value="3d_model">3D Model</option>
              <option value="graphic">Graphic & Vector</option>
              <option value="audio">Audio Track</option>
              <option value="video">Video Footage</option>
              <option value="document">Dokumen / Ebook</option>
              <option value="other">Lainnya</option>
            </select>
            <Filter class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          </div>

          <!-- Sort Filter -->
          <div class="relative">
            <select
              v-model="assetSort"
              class="appearance-none rounded-xl border border-border bg-background/80 px-3 py-2 pr-8 text-xs font-medium text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="price-desc">Harga Tertinggi</option>
              <option value="price-asc">Harga Terendah</option>
            </select>
            <ArrowUpDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          </div>

          <!-- Select All Toggle -->
          <button
            class="rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-text-primary hover:border-border-hover transition"
            @click="toggleAllAssets"
          >
            {{ isAllAssetsSelected ? 'Deselect All' : 'Select All' }}
          </button>
        </div>
      </div>

      <!-- Bulk Actions Bar for Assets -->
      <div
        v-if="selectedAssetIds.length > 0"
        class="sticky top-20 z-40 flex items-center justify-between gap-4 rounded-2xl border border-primary/40 bg-elevated/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Layers class="h-4 w-4" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-text-primary">
              {{ selectedAssetIds.length }} Aset Dipilih
            </h4>
            <p class="text-[11px] text-text-secondary">
              Aksi massal akan diterapkan ke seluruh item terpilih.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            :disabled="isBulkActionLoading"
            class="inline-flex items-center gap-1.5 rounded-xl bg-success px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50"
            @click="handleBulkApproveAssets"
          >
            <Check class="h-3.5 w-3.5" />
            <span>Approve ({{ selectedAssetIds.length }})</span>
          </button>

          <button
            :disabled="isBulkActionLoading"
            class="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
            @click="openBulkRejectModal"
          >
            <XCircle class="h-3.5 w-3.5" />
            <span>Tolak ({{ selectedAssetIds.length }})</span>
          </button>

          <button
            class="text-xs text-text-secondary hover:text-text-primary p-2"
            @click="selectedAssetIds = []"
          >
            Batal
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isAssetsLoading" class="py-16 text-center">
        <Loader2 class="mx-auto h-8 w-8 text-primary animate-spin mb-3" />
        <p class="text-xs text-text-secondary">Memuat antrean moderasi aset...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="pendingAssets.length === 0"
        class="rounded-3xl border border-border bg-elevated/40 p-16 text-center"
      >
        <FolderCheck class="mx-auto h-12 w-12 text-success/80 mb-3" />
        <h3 class="font-heading text-2xl font-bold text-text-primary mb-1">
          Antrean Review Bersih!
        </h3>
        <p class="text-xs text-text-secondary">
          Tidak ada aset baru yang sedang menunggu kurasi saat ini. Semua kiriman telah diproses.
        </p>
      </div>

      <!-- Filter No Match Empty State -->
      <div
        v-else-if="filteredAssets.length === 0"
        class="rounded-3xl border border-border bg-elevated/40 p-12 text-center"
      >
        <Search class="mx-auto h-10 w-10 text-text-secondary/50 mb-3" />
        <h3 class="font-heading text-xl font-bold text-text-primary mb-1">
          Tidak Ada Aset yang Cocok
        </h3>
        <p class="text-xs text-text-secondary mb-4">
          Tidak ditemukan aset dengan kata kunci atau filter tipe yang dipilih.
        </p>
        <button
          class="rounded-xl border border-border bg-elevated px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary transition"
          @click="assetSearch = ''; assetTypeFilter = 'all';"
        >
          Reset Filter
        </button>
      </div>

      <!-- Asset Items Queue -->
      <div v-else class="space-y-4">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="group rounded-3xl border border-border bg-elevated/80 p-5 sm:p-6 backdrop-blur-md shadow-xl transition hover:border-border-hover"
          :class="{ 'border-primary/60 bg-primary/5': selectedAssetIds.includes(asset.id) }"
        >
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <!-- Checkbox & Thumbnail & Metadata -->
            <div class="flex items-start gap-4">
              <!-- Item Checkbox -->
              <input
                type="checkbox"
                :checked="selectedAssetIds.includes(asset.id)"
                class="mt-2 h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary cursor-pointer shrink-0"
                @change="toggleAssetSelect(asset.id)"
              />

              <img
                :src="resolveAdminAssetImage(asset)"
                :alt="asset.title"
                class="h-24 w-24 rounded-2xl object-cover border border-border shrink-0"
                @error="handleImageFallback($event, asset.title, asset.assetType)"
              />

              <div class="space-y-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="rounded bg-secondary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-secondary">
                    {{ asset.assetType?.replace('_', ' ') }}
                  </span>
                  <span class="text-xs text-text-secondary">{{ asset.category?.name }}</span>
                </div>

                <h3 class="font-heading text-xl sm:text-2xl font-bold text-text-primary line-clamp-1">
                  {{ asset.title }}
                </h3>

                <p class="text-xs text-text-secondary line-clamp-1">
                  Kreator: <strong class="text-text-primary">{{ asset.seller?.name }}</strong> ({{ asset.seller?.email }})
                </p>

                <div class="flex items-center gap-4 pt-1 font-mono">
                  <span class="text-sm font-bold text-primary">
                    {{ formatCurrency(Number(asset.price)) }}
                  </span>
                  <span class="text-xs text-secondary">
                    Hak Penjual: {{ formatCurrency(Math.round(Number(asset.price) * 0.6)) }} (60%)
                  </span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-3 w-full lg:w-auto shrink-0">
              <button
                :disabled="isActionLoading"
                class="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-success px-4 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50"
                @click="handleApproveAsset(asset)"
              >
                <CheckCircle2 class="h-4 w-4" />
                <span>Setujui</span>
              </button>

              <button
                :disabled="isActionLoading"
                class="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                @click="openRejectModal(asset)"
              >
                <XCircle class="h-4 w-4" />
                <span>Tolak</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: PAYMENT VERIFICATIONS (MANUAL BANK ESCROW & 60/40) -->
    <!-- ======================================================== -->
    <div v-else class="space-y-6">
      <!-- Search & Bulk Filter Toolbar -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-border bg-elevated/70 p-3 backdrop-blur-md">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            v-model="paymentSearch"
            type="text"
            placeholder="Cari invoice, nama pembeli, bank tujuan, rekening pengirim..."
            class="w-full rounded-xl border border-border bg-background/80 pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        <button
          class="rounded-xl border border-border bg-background/80 px-3 py-2 text-xs font-semibold text-text-primary hover:border-border-hover transition shrink-0"
          @click="toggleAllPayments"
        >
          {{ isAllPaymentsSelected ? 'Deselect All' : 'Select All' }}
        </button>
      </div>

      <!-- Bulk Actions Bar for Payments -->
      <div
        v-if="selectedPaymentIds.length > 0"
        class="sticky top-20 z-40 flex items-center justify-between gap-4 rounded-2xl border border-success/40 bg-elevated/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-success/20 text-success">
            <CheckCircle2 class="h-4 w-4" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-text-primary">
              {{ selectedPaymentIds.length }} Pembayaran Dipilih
            </h4>
            <p class="text-[11px] font-mono text-secondary">
              Total Akumulasi Transfer: {{ formatCurrency(totalSelectedPaymentsAmount) }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            :disabled="isBulkActionLoading"
            class="inline-flex items-center gap-1.5 rounded-xl bg-success px-5 py-2 text-xs font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50"
            @click="handleBulkVerifyPayments"
          >
            <Check class="h-4 w-4" />
            <span>Verifikasi Semua ({{ selectedPaymentIds.length }})</span>
          </button>

          <button
            class="text-xs text-text-secondary hover:text-text-primary p-2"
            @click="selectedPaymentIds = []"
          >
            Batal
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isPaymentsLoading" class="py-16 text-center">
        <Loader2 class="mx-auto h-8 w-8 text-primary animate-spin mb-3" />
        <p class="text-xs text-text-secondary">Memuat antrean verifikasi pembayaran...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="pendingPayments.length === 0"
        class="rounded-3xl border border-border bg-elevated/40 p-16 text-center"
      >
        <CheckCircle2 class="mx-auto h-12 w-12 text-success/80 mb-3" />
        <h3 class="font-heading text-2xl font-bold text-text-primary mb-1">
          Semua Pembayaran Telah Terverifikasi!
        </h3>
        <p class="text-xs text-text-secondary">
          Tidak ada antrian konfirmasi bukti transfer manual yang tertunda saat ini.
        </p>
      </div>

      <!-- Filter No Match State -->
      <div
        v-else-if="filteredPayments.length === 0"
        class="rounded-3xl border border-border bg-elevated/40 p-12 text-center"
      >
        <Search class="mx-auto h-10 w-10 text-text-secondary/50 mb-3" />
        <h3 class="font-heading text-xl font-bold text-text-primary mb-1">
          Tidak Ditemukan Pembayaran
        </h3>
        <p class="text-xs text-text-secondary mb-4">
          Tidak ada transaksi yang cocok dengan kata kunci pencarian.
        </p>
        <button
          class="rounded-xl border border-border bg-elevated px-4 py-2 text-xs font-semibold text-text-primary hover:border-primary transition"
          @click="paymentSearch = ''"
        >
          Reset Pencarian
        </button>
      </div>

      <!-- PENDING PAYMENTS LIST -->
      <div v-else class="space-y-4">
        <div
          v-for="payment in filteredPayments"
          :key="payment.id"
          class="rounded-3xl border border-border bg-elevated/80 p-5 sm:p-6 backdrop-blur-md shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition hover:border-border-hover"
          :class="{ 'border-success/60 bg-success/5': selectedPaymentIds.includes(payment.id) }"
        >
          <!-- Left: Buyer & Transfer Data -->
          <div class="flex items-start gap-4">
            <input
              type="checkbox"
              :checked="selectedPaymentIds.includes(payment.id)"
              class="mt-2 h-4 w-4 rounded border-border bg-background text-success focus:ring-success cursor-pointer shrink-0"
              @change="togglePaymentSelect(payment.id)"
            />

            <div class="space-y-2">
              <div class="flex items-center gap-2 text-xs">
                <span class="rounded bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-400 uppercase">
                  Menunggu Verifikasi
                </span>
                <span class="text-text-secondary">Invoice:</span>
                <span class="font-mono font-bold text-text-primary">
                  {{ payment.transaction.invoiceNumber }}
                </span>
              </div>

              <div class="font-mono text-2xl font-bold text-primary">
                {{ formatCurrency(Number(payment.transferAmount)) }}
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-secondary pt-1">
                <div>
                  <span>Pembeli: </span>
                  <strong class="text-text-primary">{{ payment.buyer.name }}</strong> ({{ payment.buyer.email }})
                </div>
                <div>
                  <span>Tujuan: </span>
                  <strong class="text-text-primary">Bank {{ payment.destinationBank }} (PT ASSET MARKET)</strong>
                </div>
                <div>
                  <span>Pengirim: </span>
                  <strong class="text-text-primary">{{ payment.senderAccountName }}</strong> ({{ payment.senderBank }} - {{ payment.senderAccountNumber }})
                </div>
                <div>
                  <span>Item Dibeli: </span>
                  <strong class="text-text-primary">{{ payment.items.length }} Aset Digital</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Actions & Proof Preview -->
          <div class="flex items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-text-primary hover:border-secondary transition"
              @click="inspectingPayment = payment"
            >
              <Eye class="h-4 w-4 text-secondary" />
              <span>Lihat Bukti</span>
            </button>

            <button
              :disabled="isActionLoading"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-success px-5 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90 transition disabled:opacity-50"
              @click="handleVerifyPayment(payment)"
            >
              <Check class="h-4 w-4" />
              <span>Verifikasi (60/40)</span>
            </button>

            <button
              :disabled="isActionLoading"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
              @click="openPaymentRejectModal(payment)"
            >
              <XCircle class="h-4 w-4" />
              <span>Tolak</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: INSPECT RECEIPT SLIP -->
    <!-- ======================================================== -->
    <div
      v-if="inspectingPayment"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="relative w-full max-w-2xl rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 class="font-heading text-xl font-bold text-text-primary">
              Bukti Transfer: {{ inspectingPayment.transaction.invoiceNumber }}
            </h3>
            <p class="text-xs text-text-secondary">
              Nominal: {{ formatCurrency(Number(inspectingPayment.transferAmount)) }} dari {{ inspectingPayment.senderAccountName }}
            </p>
          </div>
          <button class="text-text-secondary hover:text-text-primary" @click="inspectingPayment = null">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="overflow-hidden rounded-2xl border border-border bg-background text-center p-2">
          <img
            :src="getAssetImageUrl(inspectingPayment.proofImageUrl)"
            :alt="inspectingPayment.transaction.invoiceNumber"
            class="mx-auto max-h-[500px] object-contain rounded-xl"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            @click="inspectingPayment = null"
          >
            Tutup
          </button>

          <button
            class="rounded-xl bg-success px-5 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
            @click="handleVerifyPayment(inspectingPayment)"
          >
            Verifikasi Pembayaran Ini
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: REJECT SINGLE ASSET LISTING -->
    <!-- ======================================================== -->
    <div
      v-if="isRejectModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="w-full max-w-lg rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-4">
        <h3 class="font-heading text-xl font-bold text-text-primary">
          Tolak Aset: {{ selectedAsset?.title }}
        </h3>
        <p class="text-xs text-text-secondary">
          Sertakan feedback kurasi kepada kreator agar dapat melakukan revisi sebelum diajukan kembali.
        </p>

        <textarea
          v-model="rejectionReason"
          rows="4"
          placeholder="Contoh: Berkas arsip tidak menyertakan dokumentasi instalasi lengkap, atau cover thumbnail berkualitas rendah..."
          class="w-full rounded-2xl border border-border bg-background p-3 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        ></textarea>

        <div class="flex items-center justify-end gap-3">
          <button
            class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            @click="closeRejectModal"
          >
            Batal
          </button>
          <button
            :disabled="isActionLoading || rejectionReason.length < 5"
            class="rounded-xl bg-red-500 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-red-600 disabled:opacity-50"
            @click="submitReject"
          >
            Kirim Penolakan
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: BULK REJECT ASSETS -->
    <!-- ======================================================== -->
    <div
      v-if="isBulkRejectModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="w-full max-w-lg rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-4">
        <h3 class="font-heading text-xl font-bold text-text-primary">
          Tolak {{ selectedAssetIds.length }} Aset Sekaligus
        </h3>
        <p class="text-xs text-text-secondary">
          Alasan ini akan dikirimkan kepada masing-masing kreator dari seluruh aset terpilih.
        </p>

        <textarea
          v-model="bulkRejectionReason"
          rows="4"
          placeholder="Contoh: Berkas tidak memenuhi standar format dan kelengkapan lisensi marketplace."
          class="w-full rounded-2xl border border-border bg-background p-3 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        ></textarea>

        <div class="flex items-center justify-end gap-3">
          <button
            class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            @click="isBulkRejectModalOpen = false"
          >
            Batal
          </button>
          <button
            :disabled="isBulkActionLoading || bulkRejectionReason.length < 5"
            class="rounded-xl bg-red-500 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-red-600 disabled:opacity-50"
            @click="submitBulkReject"
          >
            Tolak Semua ({{ selectedAssetIds.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: REJECT PAYMENT PROOF -->
    <!-- ======================================================== -->
    <div
      v-if="isPaymentRejectModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div class="w-full max-w-lg rounded-3xl border border-border bg-elevated p-6 shadow-2xl space-y-4">
        <h3 class="font-heading text-xl font-bold text-text-primary">
          Tolak Bukti Transfer
        </h3>
        <p class="text-xs text-text-secondary">
          Masukkan alasan penolakan agar pembeli memahami kendala transfer manual (misal: dana belum masuk mutasi, nominal tidak sesuai, dsb).
        </p>

        <textarea
          v-model="paymentRejectReason"
          rows="4"
          placeholder="Contoh: Bukti transfer buram dan dana belum tercatat pada mutasi bank rekening kami."
          class="w-full rounded-2xl border border-border bg-background p-3 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        ></textarea>

        <div class="flex items-center justify-end gap-3">
          <button
            class="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
            @click="closePaymentRejectModal"
          >
            Batal
          </button>
          <button
            :disabled="isActionLoading || paymentRejectReason.length < 5"
            class="rounded-xl bg-red-500 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-red-600 disabled:opacity-50"
            @click="submitPaymentReject"
          >
            Kirim Penolakan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
