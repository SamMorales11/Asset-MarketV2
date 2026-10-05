<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { assetService } from '../services/assets';
import { transactionService } from '../services/transactions';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useToast } from '../composables/useToast';
import { formatCurrency, formatFileSize } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback, getLuxuryPlaceholder } from '../utils/imageUrl';
import AssetDetailSkeleton from '../components/AssetDetailSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import type { Asset } from '../types';
import {
  Star,
  CheckCircle2,
  ShoppingBag,
  ExternalLink,
  Download,
  Calendar,
  ChevronRight,
  ShieldCheck,
  FileArchive,
  ArrowLeft,
  Sparkles,
  Zap,
  Loader2,
  Eye,
  Package,
  Shield,
  Clock,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const { toast } = useToast();

const asset = ref<Asset | null>(null);
const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref<string | null>(null);
const activeTab = ref<'description' | 'files' | 'license'>('description');
const showAddedToast = ref(false);
const isClaiming = ref(false);
const selectedImageIndex = ref(0);

const isInCart = computed(() => (asset.value ? cartStore.hasItem(asset.value.id) : false));

const isFree = computed(() => {
  if (!asset.value) return false;
  const effectivePrice =
    asset.value.discountPrice !== null && asset.value.discountPrice !== undefined
      ? Number(asset.value.discountPrice)
      : Number(asset.value.price);
  return effectivePrice === 0;
});

const formattedPrice = computed(() => {
  if (!asset.value) return '';
  if (isFree.value) return 'FREE';
  return formatCurrency(asset.value.discountPrice ?? asset.value.price);
});

const formattedOriginalPrice = computed(() => {
  if (!asset.value?.discountPrice || isFree.value) return null;
  return formatCurrency(asset.value.price);
});

const discountPercent = computed(() => {
  if (!asset.value?.discountPrice || !asset.value?.price) return null;
  const original = Number(asset.value.price);
  const discounted = Number(asset.value.discountPrice);
  if (original <= 0 || discounted >= original) return null;
  return Math.round(((original - discounted) / original) * 100);
});

const formattedThumbnail = computed(() => {
  const rawUrl =
    asset.value?.thumbnailUrl ||
    (asset.value as any)?.thumbnail ||
    (asset.value as any)?.thumbnail_url ||
    (asset.value as any)?.coverUrl ||
    (asset.value as any)?.cover_url ||
    (asset.value as any)?.imageUrl ||
    (asset.value as any)?.image_url;
  if (!rawUrl) {
    return getLuxuryPlaceholder(
      asset.value?.title || 'Asset Detail',
      asset.value?.category?.name || asset.value?.assetType || 'Curated Good'
    );
  }
  return getAssetImageUrl(rawUrl);
});

/**
 * Collects all available images: main thumbnail + preview images
 */
const allImages = computed(() => {
  if (!asset.value) return [];
  const images: string[] = [formattedThumbnail.value];
  if (asset.value.previewImages && asset.value.previewImages.length > 0) {
    asset.value.previewImages.forEach((img) => {
      const url = getAssetImageUrl(img);
      if (url && !images.includes(url)) {
        images.push(url);
      }
    });
  }
  return images;
});

const selectedImage = computed(() => {
  return allImages.value[selectedImageIndex.value] || formattedThumbnail.value;
});

const totalDeliverableSize = computed(() => {
  if (!asset.value?.files || asset.value.files.length === 0) return 'Archive Package';
  const totalBytes = asset.value.files.reduce((sum, f) => sum + (f.fileSizeBytes || 0), 0);
  return formatFileSize(totalBytes);
});

const formattedDate = computed(() => {
  if (!asset.value) return '';
  return new Date(asset.value.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
});

onMounted(async () => {
  await loadAssetDetail();
});

watch(
  () => route.params.id,
  async () => {
    selectedImageIndex.value = 0;
    await loadAssetDetail();
  }
);

async function loadAssetDetail() {
  const idOrSlug = route.params.id as string;
  if (!idOrSlug) return;

  isLoading.value = true;
  isError.value = false;
  errorMessage.value = null;

  try {
    asset.value = await assetService.getAssetByIdOrSlug(idOrSlug);
  } catch (err: any) {
    console.error('Failed to load asset detail:', err);
    isError.value = true;
    errorMessage.value =
      err?.message || 'The requested asset could not be found or has not yet been approved.';
  } finally {
    isLoading.value = false;
  }
}

function handleAddToCart() {
  if (!asset.value) return;
  cartStore.addItem(asset.value);
  showAddedToast.value = true;
  setTimeout(() => {
    showAddedToast.value = false;
  }, 3000);
}

function handleInstantBuy() {
  if (!asset.value) return;
  router.push({ path: '/checkout', query: { assetId: asset.value.id } });
}

async function handleClaimFree() {
  if (!asset.value) return;

  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }

  isClaiming.value = true;
  try {
    await transactionService.claimFreeAsset(asset.value.id);
    toast.success(
      'Aset Berhasil Diklaim!',
      'Aset ini telah ditambahkan ke My Assets Anda dan siap diunduh kapan saja.'
    );
    router.push('/purchases');
  } catch (err: any) {
    console.error('Failed to claim free asset:', err);
    toast.error('Gagal Mengklaim Aset', err?.message || 'Terjadi kesalahan saat mengklaim aset.');
  } finally {
    isClaiming.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Toast Notification -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="showAddedToast"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-success/30 bg-elevated/95 p-4 shadow-2xl backdrop-blur-xl text-sm text-text-primary"
      >
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-success/15 text-success">
          <CheckCircle2 class="h-4 w-4" />
        </div>
        <div>
          <p class="font-semibold text-[13px]">Added to Cart</p>
          <p class="text-[11px] text-text-secondary">Ready for checkout.</p>
        </div>
      </div>
    </Transition>

    <!-- ═══ LOADING SKELETON ═══ -->
    <AssetDetailSkeleton v-if="isLoading" />

    <!-- ═══ ERROR / NOT FOUND STATE ═══ -->
    <div
      v-else-if="isError || !asset"
      class="mx-auto max-w-[1440px] px-6 lg:px-12 py-16"
    >
      <EmptyState
        icon="package"
        icon-color="primary"
        title="Aset Tidak Ditemukan"
        :description="errorMessage || 'Aset digital yang Anda cari tidak tersedia, sedang dalam peninjauan moderasi, atau telah dihapus oleh pemiliknya.'"
        action-text="Jelajahi Katalog Aset"
        action-to="/explore"
        :action-icon="ArrowLeft"
      />
    </div>

    <!-- ═══════════════════════════════════════════════
         EDITORIAL ASSET CONTENT
         ═══════════════════════════════════════════════ -->
    <div v-else>
      <!-- Breadcrumb -->
      <div class="border-b border-border/25">
        <nav class="mx-auto max-w-[1440px] px-6 lg:px-12 py-4 flex items-center gap-2 text-[12px] text-text-muted">
          <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
          <ChevronRight class="h-3 w-3 opacity-40" />
          <router-link to="/explore" class="hover:text-text-primary transition">Catalog</router-link>
          <ChevronRight class="h-3 w-3 opacity-40" />
          <router-link
            v-if="asset.category"
            :to="`/explore?category=${asset.category?.slug}`"
            class="hover:text-text-primary transition"
          >
            {{ asset.category?.name }}
          </router-link>
          <ChevronRight v-if="asset.category" class="h-3 w-3 opacity-40" />
          <span class="text-text-secondary truncate max-w-[200px]">{{ asset.title }}</span>
        </nav>
      </div>

      <!-- ═══ EDITORIAL HERO ═══ -->
      <div class="border-b border-border/25">
        <div class="mx-auto max-w-[1440px] px-6 lg:px-12 pt-10 pb-10">
          <!-- Meta row -->
          <div class="flex flex-wrap items-center gap-3 mb-6">
            <span
              class="rounded-md bg-secondary/10 border border-secondary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-secondary"
            >
              {{ asset.assetType.replace('_', ' ') }}
            </span>

            <span v-if="asset.category" class="text-[12px] text-text-muted">
              in
              <router-link
                :to="`/explore?category=${asset.category?.slug}`"
                class="font-semibold text-text-secondary hover:text-primary transition"
              >
                {{ asset.category?.name }}
              </router-link>
            </span>

            <span class="text-border/60">·</span>

            <span class="inline-flex items-center gap-1.5 text-[12px] text-text-muted">
              <Calendar class="h-3 w-3 opacity-60" />
              <span>{{ formattedDate }}</span>
            </span>
          </div>

          <!-- Big Title -->
          <h1 class="font-heading text-4xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight text-text-primary leading-[1.05] mb-6">
            {{ asset.title }}
          </h1>

          <!-- Author & Stats Row -->
          <div class="flex flex-wrap items-center justify-between gap-6">
            <!-- Author -->
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15 text-secondary font-bold text-sm">
                {{ asset.seller?.name?.charAt(0).toUpperCase() || 'C' }}
              </div>
              <div>
                <div class="flex items-center gap-1.5 text-[13px]">
                  <span class="font-semibold text-text-primary">{{ asset.seller?.name }}</span>
                  <CheckCircle2
                    v-if="asset.seller?.isVerifiedSeller"
                    class="h-3.5 w-3.5 text-secondary"
                  />
                </div>
                <p class="text-[11px] text-text-muted">Verified Creator</p>
              </div>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-8 text-[12px] text-text-muted">
              <div class="flex items-center gap-1.5">
                <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
                <span class="font-bold text-text-primary tabular-nums">
                  {{ asset.ratingAvg ? Number(asset.ratingAvg).toFixed(1) : '5.0' }}
                </span>
                <span>({{ asset.ratingCount || 0 }})</span>
              </div>

              <div class="flex items-center gap-1.5">
                <Download class="h-3.5 w-3.5 text-secondary opacity-70" />
                <span class="font-bold text-text-primary tabular-nums">{{ asset.downloadCount || 0 }}</span>
                <span>downloads</span>
              </div>

              <div class="hidden sm:flex items-center gap-1.5">
                <Eye class="h-3.5 w-3.5 text-text-muted opacity-70" />
                <span class="font-bold text-text-primary tabular-nums">{{ asset.viewCount || 0 }}</span>
                <span>views</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ MAIN TWO-COLUMN LAYOUT ═══ -->
      <div class="mx-auto max-w-[1440px] px-6 lg:px-12 py-10 lg:py-12">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-start">

          <!-- LEFT COLUMN: Media + Tabs (8 cols) -->
          <div class="lg:col-span-8 space-y-8">
            <!-- ═══ Hero Image & Gallery ═══ -->
            <div class="space-y-3">
              <!-- Main Image -->
              <div class="group relative overflow-hidden rounded-2xl border border-border/40 bg-background">
                <div class="aspect-[16/10] w-full overflow-hidden">
                  <img
                    :src="selectedImage"
                    :alt="asset.title"
                    class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    @error="handleImageFallback($event, asset.title, asset.category?.name || asset.assetType)"
                  />
                </div>

                <!-- Live Demo FAB -->
                <div
                  v-if="asset.demoUrl"
                  class="absolute bottom-4 right-4"
                >
                  <a
                    :href="asset.demoUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="inline-flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2.5 text-[12px] font-semibold text-white/90 backdrop-blur-md border border-white/[0.08] shadow-lg hover:bg-black/80 hover:text-white transition"
                  >
                    <Eye class="h-3.5 w-3.5 text-secondary" />
                    <span>Live Preview</span>
                    <ExternalLink class="h-3 w-3 opacity-60" />
                  </a>
                </div>
              </div>

              <!-- Preview Thumbnails -->
              <div
                v-if="allImages.length > 1"
                class="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1"
              >
                <button
                  v-for="(img, idx) in allImages"
                  :key="idx"
                  class="shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200"
                  :class="
                    selectedImageIndex === idx
                      ? 'border-secondary shadow-md shadow-secondary/20'
                      : 'border-border/40 opacity-60 hover:opacity-100 hover:border-border-hover'
                  "
                  @click="selectedImageIndex = idx"
                >
                  <img
                    :src="img"
                    :alt="`Preview ${idx + 1}`"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              </div>
            </div>

            <!-- ═══ Content Tabs ═══ -->
            <div class="border-b border-border/30 flex items-center gap-8">
              <button
                class="pb-3 text-[13px] font-semibold transition border-b-2"
                :class="
                  activeTab === 'description'
                    ? 'border-secondary text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                "
                @click="activeTab = 'description'"
              >
                Overview
              </button>

              <button
                class="pb-3 text-[13px] font-semibold transition border-b-2"
                :class="
                  activeTab === 'files'
                    ? 'border-secondary text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                "
                @click="activeTab = 'files'"
              >
                Deliverables
                <span class="ml-1 text-[11px] text-text-muted tabular-nums">({{ asset.files?.length || 1 }})</span>
              </button>

              <button
                class="pb-3 text-[13px] font-semibold transition border-b-2"
                :class="
                  activeTab === 'license'
                    ? 'border-secondary text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                "
                @click="activeTab = 'license'"
              >
                License
              </button>
            </div>

            <!-- Tab: Description -->
            <div v-if="activeTab === 'description'" class="space-y-10">
              <!-- Description Body -->
              <div>
                <h3 class="font-heading text-2xl font-bold text-text-primary mb-5">
                  About this Asset
                </h3>
                <div class="text-[14px] text-text-secondary leading-[1.85] whitespace-pre-line max-w-[640px]">
                  {{ asset.description }}
                </div>
              </div>

              <!-- What's Included -->
              <div class="rounded-2xl border border-border/30 bg-elevated-card p-7 space-y-5">
                <h4 class="flex items-center gap-2.5 text-lg font-bold text-text-primary font-heading">
                  <Sparkles class="h-5 w-5 text-secondary" />
                  <span>What's Included</span>
                </h4>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex items-start gap-3 text-[13px] text-text-secondary">
                    <CheckCircle2 class="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>Full source code and modular components</span>
                  </div>
                  <div class="flex items-start gap-3 text-[13px] text-text-secondary">
                    <CheckCircle2 class="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>Production-ready TypeScript architecture</span>
                  </div>
                  <div class="flex items-start gap-3 text-[13px] text-text-secondary">
                    <CheckCircle2 class="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>Dark mode with design tokens</span>
                  </div>
                  <div class="flex items-start gap-3 text-[13px] text-text-secondary">
                    <CheckCircle2 class="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>Lifetime updates & creator support</span>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="asset.tags && asset.tags.length > 0">
                <div class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
                  Tags
                </div>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in asset.tags"
                    :key="tag"
                    class="rounded-lg border border-border/40 bg-elevated-card px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:border-border-hover transition cursor-default"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Tab: Files -->
            <div v-else-if="activeTab === 'files'" class="space-y-5">
              <h3 class="font-heading text-2xl font-bold text-text-primary">
                Package Contents
              </h3>
              <p class="text-[13px] text-text-muted max-w-lg">
                These files are included and available for instant download upon purchase.
              </p>

              <div class="space-y-3">
                <div
                  v-for="file in asset.files || []"
                  :key="file.id"
                  class="flex items-center justify-between rounded-xl border border-border/30 bg-elevated-card p-4 hover:border-border-hover transition"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                      <FileArchive class="h-5 w-5" />
                    </div>
                    <div>
                      <h5 class="font-mono text-[13px] font-semibold text-text-primary">{{ file.fileName }}</h5>
                      <p class="text-[11px] text-text-muted">v{{ file.version || '1.0.0' }}</p>
                    </div>
                  </div>

                  <div class="text-right text-[12px] font-mono text-text-muted tabular-nums">
                    {{ formatFileSize(file.fileSizeBytes) }}
                  </div>
                </div>

                <div
                  v-if="!asset.files || asset.files.length === 0"
                  class="flex items-center gap-3 rounded-xl border border-border/30 bg-elevated-card p-4 text-[13px] text-text-muted"
                >
                  <FileArchive class="h-5 w-5 text-secondary" />
                  <span>Primary ZIP Archive Bundle</span>
                </div>
              </div>
            </div>

            <!-- Tab: License -->
            <div v-else class="rounded-2xl border border-border/30 bg-elevated-card p-8 space-y-6">
              <h3 class="font-heading text-2xl font-bold text-text-primary">
                Commercial License
              </h3>
              <p class="text-[14px] text-text-secondary leading-relaxed max-w-lg">
                By purchasing this digital asset, you are granted a non-exclusive, worldwide, royalty-free license to utilize the assets in commercial and personal projects.
              </p>
              <ul class="space-y-3 text-[13px] text-text-secondary">
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Use for unlimited personal and client projects</span>
                </li>
                <li class="flex items-start gap-3">
                  <CheckCircle2 class="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Integrate into commercial web or mobile applications</span>
                </li>
                <li class="flex items-start gap-3">
                  <Shield class="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>Resale or redistribution of raw files as standalone products is prohibited</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- ═══ RIGHT COLUMN: Purchase Sidebar (4 cols) ═══ -->
          <aside class="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <!-- Purchase Card -->
            <div class="overflow-hidden rounded-2xl border border-border/40 bg-elevated-card shadow-2xl shadow-black/20">
              <!-- Price Section -->
              <div class="p-6 border-b border-border/25">
                <div class="text-[10px] uppercase tracking-[0.18em] text-text-muted font-medium mb-2">
                  One-time Purchase
                </div>
                <div class="flex items-baseline gap-3">
                  <span
                    class="text-[2.25rem] font-bold font-mono tracking-tight leading-none"
                    :class="isFree ? 'text-success' : 'text-text-primary'"
                  >
                    {{ formattedPrice }}
                  </span>
                  <span
                    v-if="formattedOriginalPrice"
                    class="text-sm text-text-muted line-through font-mono"
                  >
                    {{ formattedOriginalPrice }}
                  </span>
                  <span
                    v-if="discountPercent"
                    class="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary"
                  >
                    -{{ discountPercent }}%
                  </span>
                </div>
                <p class="mt-2.5 text-[11px] text-text-muted leading-relaxed">
                  Includes lifetime updates and commercial license.
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="p-6 space-y-3">
                <!-- FREE: Claim -->
                <button
                  v-if="isFree"
                  :disabled="isClaiming"
                  class="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3.5 text-[13px] font-semibold text-white shadow-lg shadow-success/20 hover:brightness-110 transition active:scale-[0.98] disabled:opacity-50"
                  @click="handleClaimFree"
                >
                  <Loader2 v-if="isClaiming" class="h-4 w-4 animate-spin" />
                  <template v-else>
                    <Download class="h-4 w-4" />
                    <span>Claim Free Asset</span>
                  </template>
                </button>

                <!-- PAID: Instant Checkout & Add to Cart -->
                <template v-else>
                  <button
                    class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[13px] font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition active:scale-[0.98]"
                    @click="handleInstantBuy"
                  >
                    <Zap class="h-4 w-4" />
                    <span>Instant Checkout</span>
                  </button>

                  <button
                    class="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition active:scale-[0.98]"
                    :class="
                      isInCart
                        ? 'border-success/30 text-success bg-success/8'
                        : 'border-border/50 text-text-primary bg-background hover:border-border-hover'
                    "
                    @click="handleAddToCart"
                  >
                    <ShoppingBag class="h-4 w-4" />
                    <span>{{ isInCart ? 'Added to Cart ✓' : 'Add to Cart' }}</span>
                  </button>
                </template>
              </div>

              <!-- Creator Revenue Share -->
              <div class="mx-6 mb-6 rounded-xl border border-secondary/20 bg-secondary/5 p-4 flex items-start gap-3">
                <ShieldCheck class="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <div class="text-[11px] text-text-secondary leading-relaxed">
                  <strong class="text-text-primary">60% Creator Revenue:</strong>
                  Direct payment to {{ asset.seller?.name }}. Transparent & verified.
                </div>
              </div>

              <!-- Specs Grid -->
              <div class="px-6 pb-6 space-y-0">
                <div class="flex items-center justify-between text-[12px] py-3 border-t border-border/20">
                  <span class="flex items-center gap-2 text-text-muted">
                    <Package class="h-3.5 w-3.5 opacity-60" />
                    Package Size
                  </span>
                  <span class="font-mono text-text-primary font-medium tabular-nums">{{ totalDeliverableSize }}</span>
                </div>
                <div class="flex items-center justify-between text-[12px] py-3 border-t border-border/20">
                  <span class="flex items-center gap-2 text-text-muted">
                    <FileArchive class="h-3.5 w-3.5 opacity-60" />
                    Format
                  </span>
                  <span class="font-mono text-text-primary font-medium uppercase">{{ asset.assetType.replace('_', ' ') }}</span>
                </div>
                <div class="flex items-center justify-between text-[12px] py-3 border-t border-border/20">
                  <span class="flex items-center gap-2 text-text-muted">
                    <Clock class="h-3.5 w-3.5 opacity-60" />
                    Delivery
                  </span>
                  <span class="text-success font-medium">Instant Download</span>
                </div>
                <div class="flex items-center justify-between text-[12px] py-3 border-t border-border/20">
                  <span class="flex items-center gap-2 text-text-muted">
                    <Shield class="h-3.5 w-3.5 opacity-60" />
                    License
                  </span>
                  <span class="text-text-primary font-medium">Commercial</span>
                </div>
              </div>
            </div>

            <!-- Creator Card -->
            <div class="rounded-2xl border border-border/30 bg-elevated-card p-6 space-y-4">
              <h4 class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
                Created by
              </h4>
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-secondary font-bold text-lg">
                  {{ asset.seller?.name?.charAt(0).toUpperCase() || 'C' }}
                </div>
                <div>
                  <h5 class="text-[13px] font-semibold text-text-primary flex items-center gap-1.5">
                    {{ asset.seller?.name }}
                    <CheckCircle2 class="h-3.5 w-3.5 text-secondary" />
                  </h5>
                  <p class="text-[11px] text-text-muted">
                    Member since {{ new Date(asset.seller?.createdAt || Date.now()).getFullYear() }}
                  </p>
                </div>
              </div>
              <p v-if="asset.seller?.bio" class="text-[12px] text-text-secondary leading-relaxed">
                {{ asset.seller.bio }}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>
