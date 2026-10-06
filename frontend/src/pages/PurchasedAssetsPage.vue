<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { userService } from '../services/users';
import { formatFileSize } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback } from '../utils/imageUrl';
import { useToast } from '../composables/useToast';
import EmptyState from '../components/EmptyState.vue';
import Skeleton from '../components/Skeleton.vue';
import UserNav from '../components/UserNav.vue';
import type { PurchasedAsset } from '../types';
import {
  Download,
  Search,
  Sparkles,
  Calendar,
  FileArchive,
  CheckCircle2,
  ExternalLink,
} from 'lucide-vue-next';

const { toast } = useToast();

const purchases = ref<PurchasedAsset[]>([]);
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const searchQuery = ref('');
const selectedType = ref('all');
const downloadingIds = ref<Record<string, boolean>>({});

onMounted(async () => {
  await loadPurchasedAssets();
});

async function loadPurchasedAssets() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const data = await userService.getMyAssets();
    purchases.value = data.assets;
  } catch (err: any) {
    console.error('Failed to load purchases:', err);
    errorMessage.value = err?.message || 'Gagal memuat daftar aset yang telah Anda miliki.';
  } finally {
    isLoading.value = false;
  }
}

const filteredPurchases = computed(() => {
  return purchases.value.filter((item) => {
    const matchesSearch =
      item.asset.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.invoiceNumber.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.asset.seller?.name?.toLowerCase().includes(searchQuery.value.toLowerCase());

    const matchesType =
      selectedType.value === 'all' || item.asset.assetType === selectedType.value;

    return matchesSearch && matchesType;
  });
});

async function handleDownload(params: {
  fileId?: string;
  assetId?: string;
  fileName?: string;
}) {
  const downloadKey = params.fileId || params.assetId || 'default';
  if (downloadingIds.value[downloadKey]) return;

  downloadingIds.value[downloadKey] = true;
  const targetLabel = params.fileName || 'paket deliverable';

  toast.info('Memulai Unduhan', `Sedang menyiapkan ${targetLabel}...`);

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('access_token');
    const url = params.fileId
      ? `${baseUrl}/purchases/download/${params.fileId}`
      : `${baseUrl}/purchases/assets/${params.assetId}/download`;

    const response = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let serverMsg = '';
      try {
        const errorJson = await response.json();
        serverMsg = errorJson?.message || '';
      } catch {
        // Response is not JSON
      }

      if (response.status === 404) {
        throw new Error(
          serverMsg ||
            'Berkas fisik aset tidak ditemukan di server penyimpanan. Silakan hubungi tim dukungan.'
        );
      } else if (response.status === 403) {
        throw new Error(
          serverMsg || 'Akses ditolak: Anda belum membeli atau mengklaim aset ini.'
        );
      } else {
        throw new Error(
          serverMsg || `Gagal mengunduh berkas (Status HTTP ${response.status}).`
        );
      }
    }

    // Resolve filename from Content-Disposition header if available
    const disposition = response.headers.get('Content-Disposition');
    let resolvedName = params.fileName || 'asset-deliverable.zip';

    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        resolvedName = decodeURIComponent(utf8Match[1]);
      } else {
        const standardMatch = disposition.match(/filename="?([^";]+)"?/i);
        if (standardMatch && standardMatch[1]) {
          resolvedName = decodeURIComponent(standardMatch[1]);
        }
      }
    }

    // Stream response chunks as a Blob
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = resolvedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);

    toast.success('Unduhan Berhasil', `Berkas ${resolvedName} berhasil disimpan.`);
  } catch (err: any) {
    console.error('Download error:', err);
    toast.error('Gagal Mengunduh', err?.message || 'Terjadi gangguan saat mengunduh berkas aset.');
  } finally {
    downloadingIds.value[downloadKey] = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-4 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">My Assets</span>
    </nav>

    <!-- User Navigation Sub-Header -->
    <UserNav />

    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
            My Digital Assets
          </h1>
          <span
            v-if="purchases.length > 0"
            class="rounded-full bg-secondary/15 border border-secondary/30 px-3 py-0.5 font-mono text-xs font-bold text-secondary"
          >
            {{ purchases.length }} Owned
          </span>
        </div>
        <p class="text-xs text-text-secondary">
          Your personal digital vault with instant deliverable archive downloads and commercial rights.
        </p>
      </div>

      <!-- Search & Filters -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search owned assets..."
            class="w-full rounded-xl border border-border bg-elevated py-2 pl-9 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Search class="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-secondary" />
        </div>

        <select
          v-model="selectedType"
          class="rounded-xl border border-border bg-elevated px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
        >
          <option value="all">All Formats</option>
          <option value="source_code">Source Code</option>
          <option value="ui_template">UI Template</option>
          <option value="3d_model">3D Model</option>
          <option value="graphic">Graphic</option>
          <option value="document">Document</option>
        </select>
      </div>
    </div>

    <!-- LOADING SKELETONS GRID -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="n in 4"
        :key="n"
        class="overflow-hidden rounded-3xl border border-border/50 bg-elevated/70 p-6 backdrop-blur-md shadow-xl flex flex-col justify-between space-y-4"
      >
        <div class="flex items-start gap-4">
          <Skeleton variant="card" width="w-24" height="h-24" rounded="rounded-2xl" />
          <div class="flex-1 space-y-2.5">
            <div class="flex items-center gap-2">
              <Skeleton variant="badge" width="w-16" height="h-4" rounded="rounded" />
              <Skeleton variant="text" width="w-20" height="h-3" rounded="rounded" />
            </div>
            <Skeleton variant="title" width="w-3/4" height="h-5" rounded="rounded-md" />
            <Skeleton variant="text" width="w-1/2" height="h-3" rounded="rounded" />
            <Skeleton variant="text" width="w-1/3" height="h-2.5" rounded="rounded" />
          </div>
        </div>
        <div class="flex items-center justify-between border-t border-border/30 pt-4 mt-2">
          <Skeleton variant="button" width="w-28" height="h-9" rounded="rounded-xl" />
          <Skeleton variant="button" width="w-32" height="h-9" rounded="rounded-xl" />
        </div>
      </div>
    </div>

    <!-- ERROR STATE -->
    <div
      v-else-if="errorMessage"
      class="rounded-3xl border border-red-500/30 bg-red-500/10 p-12 text-center"
    >
      <p class="text-xs text-red-400 mb-4">{{ errorMessage }}</p>
      <button
        class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow hover:bg-primary-hover transition"
        @click="loadPurchasedAssets"
      >
        Coba Lagi
      </button>
    </div>

    <!-- EMPTY STATE: NO PURCHASED ASSETS -->
    <EmptyState
      v-else-if="purchases.length === 0"
      icon="library"
      icon-color="secondary"
      title="Belum Ada Aset yang Dimiliki"
      description="Setelah Anda membeli aset digital atau mengklaim aset gratis, seluruh berkas deliverable berlisensi Anda akan tersimpan di sini secara permanen dan siap diunduh kapan saja."
      action-text="Jelajahi Katalog Aset"
      action-to="/explore"
      :action-icon="Sparkles"
    />

    <!-- NO SEARCH RESULTS -->
    <EmptyState
      v-else-if="filteredPurchases.length === 0"
      compact
      icon="search"
      icon-color="muted"
      title="Tidak Ada Aset yang Cocok"
      description="Tidak ada koleksi aset yang cocok dengan filter kategori atau kata kunci pencarian Anda."
      action-text="Reset Pencarian"
      action-variant="outline"
      @action="searchQuery = ''; selectedType = 'all';"
    />

    <!-- OWNED ASSETS GRID (Luxury Editorial Cards) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="item in filteredPurchases"
        :key="item.transactionId + item.asset.id"
        class="group overflow-hidden rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-md transition hover:border-border-hover shadow-xl flex flex-col justify-between"
      >
        <div class="space-y-4">
          <!-- Top Meta Row -->
          <div class="flex items-start gap-4">
            <img
              :src="getAssetImageUrl(item.asset.thumbnailUrl)"
              :alt="item.asset.title"
              class="h-24 w-24 rounded-2xl object-cover border border-border shrink-0"
              @error="handleImageFallback($event, item.asset.title, item.asset.assetType)"
            />

            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-center gap-2">
                <span class="rounded bg-secondary/15 px-2 py-0.5 text-[9px] font-bold uppercase text-secondary">
                  {{ item.asset.assetType?.replace('_', ' ') }}
                </span>
                <span class="text-[11px] text-text-secondary">
                  Invoice: <strong class="text-text-primary font-mono">{{ item.invoiceNumber }}</strong>
                </span>
              </div>

              <router-link
                :to="`/assets/${item.asset.slug || item.asset.id}`"
                class="block font-heading text-xl font-bold text-text-primary hover:text-primary transition truncate"
              >
                {{ item.asset.title }}
              </router-link>

              <p class="text-xs text-text-secondary">
                By {{ item.asset.seller?.name || 'Verified Creator' }}
              </p>

              <div class="flex items-center gap-2 text-[10px] text-success pt-0.5">
                <CheckCircle2 class="h-3.5 w-3.5" />
                <span>Commercial Standard License Active</span>
              </div>
            </div>

            <!-- Primary 1-Click Card Action Button -->
            <button
              :disabled="downloadingIds[item.asset.id] || (item.asset.files?.[0] && downloadingIds[item.asset.files[0].id])"
              class="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              @click="
                item.asset.files && item.asset.files.length === 1
                  ? handleDownload({ fileId: item.asset.files[0].id, fileName: item.asset.files[0].fileName })
                  : handleDownload({ assetId: item.asset.id, fileName: `${item.asset.slug || 'asset'}-package.zip` })
              "
            >
              <Loader2
                v-if="downloadingIds[item.asset.id] || (item.asset.files?.[0] && downloadingIds[item.asset.files[0].id])"
                class="h-3.5 w-3.5 animate-spin"
              />
              <Download v-else class="h-3.5 w-3.5" />
              <span>
                {{
                  downloadingIds[item.asset.id] || (item.asset.files?.[0] && downloadingIds[item.asset.files[0].id])
                    ? 'Mengunduh...'
                    : 'Download'
                }}
              </span>
            </button>
          </div>

          <!-- Deliverable Package Files List -->
          <div class="rounded-2xl border border-border bg-background/60 p-4 space-y-2.5">
            <div class="flex items-center justify-between text-xs font-semibold text-text-secondary">
              <span class="flex items-center gap-1.5">
                <FileArchive class="h-3.5 w-3.5 text-secondary" />
                <span>Berkas Deliverables Siap Unduh</span>
              </span>
              <span>{{ item.asset.files?.length || 1 }} berkas</span>
            </div>

            <div v-if="item.asset.files && item.asset.files.length > 0" class="space-y-2">
              <div
                v-for="file in item.asset.files"
                :key="file.id"
                class="flex items-center justify-between rounded-xl border border-border bg-elevated p-2.5 text-xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <FileArchive class="h-4 w-4 text-secondary shrink-0" />
                  <div class="truncate">
                    <p class="font-mono text-xs font-bold text-text-primary truncate">{{ file.fileName }}</p>
                    <p class="text-[10px] text-text-secondary font-mono">
                      {{ formatFileSize(file.fileSizeBytes) }} • v{{ file.version || '1.0.0' }}
                    </p>
                  </div>
                </div>

                <!-- 1-Click File Download Button -->
                <button
                  :disabled="downloadingIds[file.id]"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                  @click="handleDownload({ fileId: file.id, fileName: file.fileName })"
                >
                  <Loader2 v-if="downloadingIds[file.id]" class="h-3.5 w-3.5 animate-spin" />
                  <Download v-else class="h-3.5 w-3.5" />
                  <span>{{ downloadingIds[file.id] ? 'Mengunduh...' : 'Download' }}</span>
                </button>
              </div>
            </div>

            <!-- Fallback if file records were not populated -->
            <div v-else class="flex items-center justify-between rounded-xl border border-border bg-elevated p-2.5 text-xs">
              <div class="flex items-center gap-2.5 min-w-0">
                <FileArchive class="h-4 w-4 text-secondary shrink-0" />
                <div class="truncate">
                  <p class="font-mono text-xs font-bold text-text-primary truncate">Main Deliverable Bundle (.ZIP)</p>
                  <p class="text-[10px] text-text-secondary font-mono">Arsip utama paket aset lengkap</p>
                </div>
              </div>

              <button
                :disabled="downloadingIds[item.asset.id]"
                class="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                @click="handleDownload({ assetId: item.asset.id, fileName: `${item.asset.slug || 'asset'}-package.zip` })"
              >
                <Loader2 v-if="downloadingIds[item.asset.id]" class="h-3.5 w-3.5 animate-spin" />
                <Download v-else class="h-3.5 w-3.5" />
                <span>{{ downloadingIds[item.asset.id] ? 'Mengunduh...' : 'Download (.ZIP)' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Meta -->
        <div class="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-secondary">
          <span class="flex items-center gap-1">
            <Calendar class="h-3 w-3" />
            Dibeli pada {{ new Date(item.purchaseDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) }}
          </span>

          <router-link
            :to="`/transactions/${item.invoiceNumber}`"
            class="inline-flex items-center gap-1 hover:text-text-primary transition underline"
          >
            <span>Resi & Tagihan</span>
            <ExternalLink class="h-3 w-3" />
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
