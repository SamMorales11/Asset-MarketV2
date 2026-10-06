<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { assetService } from '../services/assets';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import Skeleton from '../components/Skeleton.vue';
import UserNav from '../components/UserNav.vue';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback, getLuxuryPlaceholder } from '../utils/imageUrl';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';
import type { Asset, AssetStatus } from '../types';
import {
  Plus,
  Search,
  AlertTriangle,
  FolderOpen,
  Eye,
  Download,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Layers,
  Loader2,
  Send,
} from 'lucide-vue-next';

const { toast } = useToast();
const { confirm } = useConfirm();

const assets = ref<Asset[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);

const activeFilter = ref<'all' | AssetStatus>('all');
const searchQuery = ref('');
const submittingAssetId = ref<string | null>(null);
const actionError = ref<{ assetId: string; message: string } | null>(null);

onMounted(async () => {
  await loadListings();
});

async function loadListings() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    assets.value = await assetService.getMyListings();
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.message || err?.message || 'Gagal memuat katalog aset Anda.';
  } finally {
    isLoading.value = false;
  }
}

/**
 * Handle seller submitting or resubmitting an asset for admin moderation
 */
async function handleSubmitForModeration(item: Asset) {
  if (submittingAssetId.value) return; // Prevent double submit

  const confirmed = await confirm({
    title: 'Ajukan Aset ke Moderasi Admin?',
    message: `Aset "${item.title}" akan dikirimkan ke antrean kurator untuk ditinjau kelayakan berkas dan kelengkapan lisensinya. Estimasi proses review adalah 1x24 jam.`,
    confirmText: 'Ya, Ajukan Sekarang',
    cancelText: 'Batal',
    variant: 'primary',
  });
  if (!confirmed) return;

  submittingAssetId.value = item.id;
  actionError.value = null;

  try {
    const updatedAsset = await assetService.submitForModeration(item.id);

    // Update the asset in local state immediately for seamless reactivity
    const index = assets.value.findIndex((a) => a.id === item.id);
    if (index !== -1) {
      assets.value[index] = {
        ...assets.value[index],
        status: 'pending',
        rejectionReason: null,
        updatedAt: updatedAsset?.updatedAt || new Date().toISOString(),
      };
    } else {
      item.status = 'pending';
      item.rejectionReason = null;
    }

    toast.success(
      'Aset Berhasil Diajukan!',
      `Aset "${item.title}" berhasil diajukan untuk moderasi administrator.`
    );
  } catch (err: any) {
    const errorMsg =
      err?.response?.data?.message ||
      err?.message ||
      'Gagal mengajukan moderasi aset. Silakan periksa koneksi Anda dan coba lagi.';
    actionError.value = {
      assetId: item.id,
      message: errorMsg,
    };
    toast.error('Gagal Mengajukan Moderasi', errorMsg);
  } finally {
    submittingAssetId.value = null;
  }
}

// Counts for tabs and metric cards
const counts = computed(() => {
  return {
    all: assets.value.length,
    pending: assets.value.filter((a) => a.status === 'pending').length,
    approved: assets.value.filter((a) => a.status === 'approved').length,
    rejected: assets.value.filter((a) => a.status === 'rejected').length,
  };
});

// Resolve image URL from any available field alias, with luxury fallback
function resolveListingImage(item: Asset): string {
  const raw =
    (item as any).thumbnailUrl ||
    (item as any).thumbnail ||
    (item as any).thumbnail_url ||
    (item as any).coverUrl ||
    (item as any).cover_url ||
    (item as any).imageUrl ||
    (item as any).image_url;
  if (!raw) {
    return getLuxuryPlaceholder(item.title, item.category?.name || item.assetType);
  }
  return getAssetImageUrl(raw);
}

// Filtered and searched assets
const filteredAssets = computed(() => {
  return assets.value.filter((item) => {
    const matchesFilter =
      activeFilter.value === 'all' || item.status === activeFilter.value;
    const q = searchQuery.value.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.slug || '').toLowerCase().includes(q) ||
      (item.category?.name || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
});
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">My Listings</span>
    </nav>

    <!-- User Navigation Sub-Header -->
    <UserNav />

    <!-- Header with Action -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider mb-1">
          <Layers class="h-3.5 w-3.5" />
          <span>Creator Studio • Inventory</span>
        </div>
        <h1 class="font-heading text-4xl sm:text-5xl font-bold text-text-primary">
          Manage My Listings
        </h1>
        <p class="mt-2 text-xs sm:text-sm text-text-secondary">
          Pantau status kurasi moderasi, evaluasi feedback kurator, dan kelola portofolio aset digital Anda.
        </p>
      </div>

      <router-link
        to="/upload"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover transition transform active:scale-95 shrink-0"
      >
        <Plus class="h-4 w-4" />
        <span>Unggah Aset Baru</span>
      </router-link>
    </div>

    <!-- Inventory Stat Cards Skeletons -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <div v-for="n in 4" :key="n" class="rounded-2xl border border-border/50 bg-elevated/70 p-4 space-y-2.5 shadow-md">
        <div class="flex items-center justify-between">
          <Skeleton variant="text" width="w-20" height="h-3" rounded="rounded" />
          <Skeleton variant="avatar" width="w-4" height="h-4" rounded="rounded" />
        </div>
        <Skeleton variant="title" width="w-14" height="h-7" rounded="rounded-md" />
        <Skeleton variant="text" width="w-28" height="h-2.5" rounded="rounded" />
      </div>
    </div>

    <!-- Quick Inventory Stat Cards (Editorial Luxury Strip) -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <!-- Total Listings -->
      <div
        class="rounded-2xl border border-border bg-elevated/80 p-4 backdrop-blur-md cursor-pointer transition hover:border-border-hover"
        :class="{ 'ring-2 ring-primary': activeFilter === 'all' }"
        @click="activeFilter = 'all'"
      >
        <div class="flex items-center justify-between text-text-secondary text-xs mb-1">
          <span>Total Aset</span>
          <FolderOpen class="h-4 w-4 text-text-muted" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
          {{ counts.all }}
        </div>
        <p class="text-[10px] text-text-secondary mt-1">Seluruh portofolio kreator</p>
      </div>

      <!-- Approved & Live -->
      <div
        class="rounded-2xl border border-success/30 bg-success/5 p-4 backdrop-blur-md cursor-pointer transition hover:border-success/60"
        :class="{ 'ring-2 ring-success': activeFilter === 'approved' }"
        @click="activeFilter = 'approved'"
      >
        <div class="flex items-center justify-between text-success text-xs mb-1">
          <span class="font-semibold">Live & Aktif</span>
          <CheckCircle2 class="h-4 w-4 text-success" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-success font-mono">
          {{ counts.approved }}
        </div>
        <p class="text-[10px] text-success/80 mt-1">Dapat dibeli publik</p>
      </div>

      <!-- Pending Kurasi -->
      <div
        class="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-md cursor-pointer transition hover:border-amber-500/60"
        :class="{ 'ring-2 ring-amber-500': activeFilter === 'pending' }"
        @click="activeFilter = 'pending'"
      >
        <div class="flex items-center justify-between text-amber-400 text-xs mb-1">
          <span class="font-semibold">Dalam Kurasi</span>
          <Clock class="h-4 w-4 text-amber-400" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
          {{ counts.pending }}
        </div>
        <p class="text-[10px] text-amber-400/80 mt-1">Antrean review (1-24 jam)</p>
      </div>

      <!-- Needs Revision -->
      <div
        class="rounded-2xl border border-primary/30 bg-primary/5 p-4 backdrop-blur-md cursor-pointer transition hover:border-primary/60"
        :class="{ 'ring-2 ring-primary': activeFilter === 'rejected' }"
        @click="activeFilter = 'rejected'"
      >
        <div class="flex items-center justify-between text-primary text-xs mb-1">
          <span class="font-semibold">Perlu Revisi</span>
          <AlertOctagon class="h-4 w-4 text-primary" />
        </div>
        <div class="font-heading text-2xl sm:text-3xl font-bold text-primary font-mono">
          {{ counts.rejected }}
        </div>
        <p class="text-[10px] text-primary/80 mt-1">Ada feedback kurator</p>
      </div>
    </div>

    <!-- Filter Tabs & Search Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
      <!-- Status Tabs -->
      <div class="flex flex-wrap gap-2">
        <button
          class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition"
          :class="
            activeFilter === 'all'
              ? 'bg-primary text-white font-semibold shadow-md'
              : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
          "
          @click="activeFilter = 'all'"
        >
          Semua ({{ counts.all }})
        </button>

        <button
          class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition"
          :class="
            activeFilter === 'approved'
              ? 'bg-success text-white font-semibold shadow-md'
              : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
          "
          @click="activeFilter = 'approved'"
        >
          Live Disetujui ({{ counts.approved }})
        </button>

        <button
          class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition"
          :class="
            activeFilter === 'pending'
              ? 'bg-amber-500 text-background font-semibold shadow-md'
              : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
          "
          @click="activeFilter = 'pending'"
        >
          Menunggu Review ({{ counts.pending }})
        </button>

        <button
          class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition"
          :class="
            activeFilter === 'rejected'
              ? 'bg-primary text-white font-semibold shadow-md'
              : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
          "
          @click="activeFilter = 'rejected'"
        >
          Perlu Revisi ({{ counts.rejected }})
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full md:w-72">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari aset karya Anda..."
          class="w-full rounded-xl border border-border bg-elevated/70 pl-10 pr-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none backdrop-blur-sm"
        />
      </div>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="n in 6"
        :key="n"
        class="overflow-hidden rounded-3xl border border-border/50 bg-elevated/70 p-5 space-y-4 shadow-xl"
      >
        <Skeleton variant="card" height="h-44" rounded="rounded-2xl" />
        <div class="flex items-center justify-between">
          <Skeleton variant="badge" width="w-20" height="h-5" rounded="rounded-full" />
          <Skeleton variant="text" width="w-24" height="h-3" rounded="rounded" />
        </div>
        <Skeleton variant="title" width="w-4/5" height="h-6" rounded="rounded-lg" />
        <div class="pt-2 border-t border-border/30 flex items-center justify-between">
          <Skeleton variant="text" width="w-24" height="h-4" rounded="rounded" />
          <div class="flex gap-2">
            <Skeleton variant="button" width="w-16" height="h-7" rounded="rounded-lg" />
            <Skeleton variant="button" width="w-16" height="h-7" rounded="rounded-lg" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="errorMessage"
      class="rounded-3xl border border-primary/40 bg-primary/10 p-8 text-center"
    >
      <AlertTriangle class="mx-auto h-8 w-8 text-primary mb-3" />
      <p class="text-xs font-medium text-primary">{{ errorMessage }}</p>
      <button
        class="mt-4 rounded-xl border border-primary/40 bg-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/30 transition"
        @click="loadListings"
      >
        Coba Muat Ulang
      </button>
    </div>

    <!-- Empty State: No Assets at All -->
    <EmptyState
      v-else-if="assets.length === 0"
      icon="sparkles"
      icon-color="secondary"
      title="Belum Ada Aset yang Diunggah"
      description="Mulailah memonetisasi karya digital Anda di Asset Market. Dapatkan bagi hasil 60% untuk setiap transaksi penjualan dengan sistem penyaluran otomatis."
      action-text="Unggah Aset Digital Pertama Anda"
      action-to="/upload"
      :action-icon="Plus"
    />

    <!-- Empty State: Filter / Search Returned 0 Items -->
    <EmptyState
      v-else-if="filteredAssets.length === 0"
      compact
      icon="search"
      icon-color="muted"
      title="Tidak Ada Aset yang Sesuai"
      :description="`Tidak ditemukan karya aset pada kategori filter ini atau dengan kata kunci '${searchQuery}'.`"
      action-text="Reset Filter & Pencarian"
      action-variant="outline"
      @action="activeFilter = 'all'; searchQuery = '';"
    />

    <!-- ASSETS GRID (Luxury Editorial Cards with Informative Badges) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="item in filteredAssets"
        :key="item.id"
        class="group flex flex-col overflow-hidden rounded-3xl border border-border bg-elevated/80 transition-all hover:border-border-hover hover:shadow-2xl backdrop-blur-md"
      >
        <!-- Thumbnail & Badges Container -->
        <div class="relative aspect-video w-full overflow-hidden bg-elevated-subtle">
          <img
            :src="resolveListingImage(item)"
            :alt="item.title"
            class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            @error="handleImageFallback($event, item.title, item.category?.name || item.assetType)"
          />

          <!-- Informative Status Badge on Thumbnail -->
          <div class="absolute top-3 left-3 z-10">
            <StatusBadge :status="item.status" size="sm" :show-helper="true" />
          </div>

          <!-- Asset Type Pill -->
          <span class="absolute top-3 right-3 rounded-lg bg-background/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-text-primary border border-border uppercase">
            {{ item.assetType.replace('_', ' ') }}
          </span>
        </div>

        <!-- Card Body -->
        <div class="flex flex-1 flex-col p-5 sm:p-6 justify-between space-y-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px] text-text-secondary">
              <span>{{ item.category?.name || 'Katalog Digital' }}</span>
              <span class="font-mono text-[10px] text-text-muted">ID: {{ item.id.slice(0, 8) }}</span>
            </div>

            <h3 class="font-heading text-xl font-bold text-text-primary line-clamp-1 group-hover:text-primary transition">
              {{ item.title }}
            </h3>

            <p class="text-xs text-text-secondary line-clamp-2 leading-relaxed">
              {{ item.shortDescription || item.description }}
            </p>

            <!-- Status Explanation Banners -->
            <!-- 1. UNDER REVIEW INFORMATIVE BANNER -->
            <div
              v-if="item.status === 'pending'"
              class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 space-y-1"
            >
              <div class="flex items-center gap-1.5 font-bold">
                <Clock class="h-3.5 w-3.5" />
                <span>Sedang Dalam Proses Kurasi</span>
              </div>
              <p class="text-[11px] leading-relaxed text-text-secondary">
                Tim kurator sedang menguji kelayakan berkas arsip dan lisensi. Review selesai dalam estimasi 1x24 jam.
              </p>
            </div>

            <!-- 2. REJECTED FEEDBACK WITH ACTIONABLE GUIDE -->
            <div
              v-if="item.status === 'rejected'"
              class="rounded-2xl border border-primary/40 bg-primary/10 p-3.5 text-xs text-primary space-y-2.5"
            >
              <div class="flex items-center gap-1.5 font-bold">
                <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
                <span>Feedback Penolakan Kurator:</span>
              </div>
              <p class="text-[11px] leading-relaxed text-text-primary/90 italic bg-background/50 p-2.5 rounded-xl border border-primary/20">
                "{{ item.rejectionReason || 'Berkas deliverable tidak memenuhi standar kelengkapan lisensi dan dokumentasi yang disyaratkan.' }}"
              </p>
              <p class="text-[10px] text-text-secondary leading-normal">
                Silakan lakukan revisi berkas sesuai catatan di atas lalu klik tombol di bawah untuk mengajukan kembali ke kurasi.
              </p>

              <!-- Inline Error Feedback if submission failed -->
              <div
                v-if="actionError && actionError.assetId === item.id"
                class="rounded-xl border border-primary/40 bg-primary/20 p-2.5 text-[11px] text-primary flex items-start gap-1.5"
              >
                <AlertTriangle class="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{{ actionError.message }}</span>
              </div>

              <!-- Submit for Admin Moderation Button -->
              <button
                type="button"
                id="submit-moderation-btn"
                @click.stop="handleSubmitForModeration(item)"
                :disabled="submittingAssetId === item.id"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-[0.98]"
              >
                <Loader2 v-if="submittingAssetId === item.id" class="h-3.5 w-3.5 animate-spin" />
                <Send v-else class="h-3.5 w-3.5" />
                <span>{{ submittingAssetId === item.id ? 'Mengajukan ke Moderasi...' : 'Submit for Admin Moderation' }}</span>
              </button>
            </div>

            <!-- 3. APPROVED PUBLIC ACCESS -->
            <div
              v-if="item.status === 'approved'"
              class="rounded-2xl border border-success/30 bg-success/5 p-2.5 text-xs text-success flex items-center justify-between"
            >
              <div class="flex items-center gap-1.5 font-medium">
                <CheckCircle2 class="h-3.5 w-3.5" />
                <span>Telah Live & Terindeks</span>
              </div>

              <router-link
                :to="`/assets/${item.slug || item.id}`"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-success hover:underline"
              >
                <span>Lihat Publik</span>
                <ExternalLink class="h-3 w-3" />
              </router-link>
            </div>
          </div>

          <!-- Price & Metrics Footer -->
          <div class="border-t border-border pt-4 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <div>
                <span class="text-[10px] uppercase text-text-secondary">Harga Jual</span>
                <div class="font-bold text-text-primary text-sm font-mono">
                  {{ formatCurrency(Number(item.price)) }}
                </div>
              </div>

              <div class="text-right">
                <span class="text-[10px] uppercase text-secondary font-semibold">Bagi Hasil Anda (60%)</span>
                <div class="font-bold text-secondary text-sm font-mono">
                  {{ formatCurrency(Math.round(Number(item.price) * 0.6)) }}
                </div>
              </div>
            </div>

            <!-- Stats Bar -->
            <div class="flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-text-secondary">
              <span class="flex items-center gap-1">
                <Calendar class="h-3 w-3" />
                {{ new Date(item.createdAt).toLocaleDateString() }}
              </span>

              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1" title="Jumlah Pengunjung">
                  <Eye class="h-3 w-3 text-text-muted" />
                  {{ item.viewCount || 0 }}
                </span>
                <span class="flex items-center gap-1" title="Jumlah Unduhan">
                  <Download class="h-3 w-3 text-secondary" />
                  {{ item.downloadCount || 0 }}
                </span>
                <a
                  v-if="item.demoUrl"
                  :href="item.demoUrl"
                  class="hover:text-primary transition"
                  title="Buka Demo URL"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
