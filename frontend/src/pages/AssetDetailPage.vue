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
  if (isFree.value) return 'GRATIS';
  return formatCurrency(asset.value.discountPrice ?? asset.value.price);
});

const formattedOriginalPrice = computed(() => {
  if (!asset.value?.discountPrice || isFree.value) return null;
  return formatCurrency(asset.value.price);
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

const totalDeliverableSize = computed(() => {
  if (!asset.value?.files || asset.value.files.length === 0) return 'Archive Package';
  const totalBytes = asset.value.files.reduce((sum, f) => sum + (f.fileSizeBytes || 0), 0);
  return formatFileSize(totalBytes);
});

onMounted(async () => {
  await loadAssetDetail();
});

watch(
  () => route.params.id,
  async () => {
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
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Toast Notification for Add to Cart -->
    <div
      v-if="showAddedToast"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-success/40 bg-elevated/95 p-4 shadow-2xl backdrop-blur-md text-xs text-text-primary animate-bounce"
    >
      <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-success/20 text-success">
        <CheckCircle2 class="h-4 w-4" />
      </div>
      <div>
        <p class="font-bold">Item Added to Cart</p>
        <p class="text-[11px] text-text-secondary">Ready for checkout whenever you are.</p>
      </div>
    </div>

    <!-- LOADING STATE (Editorial Skeleton) -->
    <div v-if="isLoading" class="space-y-8 animate-pulse">
      <!-- Breadcrumb Skeleton -->
      <div class="h-4 w-64 bg-border/60 rounded"></div>

      <!-- Hero Header Skeleton -->
      <div class="space-y-4">
        <div class="h-6 w-32 bg-border/50 rounded-full"></div>
        <div class="h-12 w-3/4 bg-border/80 rounded-xl"></div>
        <div class="h-4 w-1/2 bg-border/50 rounded"></div>
      </div>

      <!-- Two-Column Grid Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div class="lg:col-span-8 space-y-6">
          <div class="aspect-video w-full bg-elevated-subtle rounded-3xl"></div>
          <div class="space-y-3 pt-4">
            <div class="h-4 w-full bg-border/50 rounded"></div>
            <div class="h-4 w-5/6 bg-border/50 rounded"></div>
            <div class="h-4 w-2/3 bg-border/50 rounded"></div>
          </div>
        </div>

        <div class="lg:col-span-4 space-y-6">
          <div class="h-64 rounded-3xl bg-elevated/60 border border-border"></div>
          <div class="h-48 rounded-3xl bg-elevated/60 border border-border"></div>
        </div>
      </div>
    </div>

    <!-- ERROR STATE -->
    <div
      v-else-if="isError || !asset"
      class="rounded-3xl border border-primary/30 bg-primary/10 p-16 text-center text-xs text-primary"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-primary mb-4">
        <ArrowLeft class="h-8 w-8" />
      </div>
      <h2 class="font-heading text-3xl font-bold text-text-primary mb-2">
        Asset Not Available
      </h2>
      <p class="max-w-md mx-auto text-text-secondary leading-relaxed mb-6">
        {{ errorMessage }}
      </p>
      <router-link
        to="/explore"
        class="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-semibold text-white shadow hover:bg-primary-hover transition"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>Browse Catalog</span>
      </router-link>
    </div>

    <!-- EDITORIAL ASSET CONTENT -->
    <div v-else class="space-y-8">
      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center gap-2 text-xs text-text-secondary">
        <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
        <ChevronRight class="h-3 w-3" />
        <router-link to="/explore" class="hover:text-text-primary transition">Catalog</router-link>
        <ChevronRight class="h-3 w-3" />
        <router-link
          :to="`/explore?category=${asset.category?.slug}`"
          class="hover:text-text-primary transition"
        >
          {{ asset.category?.name }}
        </router-link>
        <ChevronRight class="h-3 w-3" />
        <span class="text-text-primary truncate max-w-[200px]">{{ asset.title }}</span>
      </nav>

      <!-- Editorial Header Section -->
      <header class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="rounded-md bg-secondary/15 border border-secondary/30 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-secondary"
          >
            {{ asset.assetType.replace('_', ' ') }}
          </span>

          <span class="text-xs text-text-secondary">Category:</span>
          <router-link
            :to="`/explore?category=${asset.category?.slug}`"
            class="text-xs font-semibold text-text-primary hover:text-primary transition"
          >
            {{ asset.category?.name }}
          </router-link>

          <span class="text-border">|</span>

          <span class="inline-flex items-center gap-1 text-xs text-text-secondary">
            <Calendar class="h-3.5 w-3.5" />
            <span>Updated {{ new Date(asset.createdAt).toLocaleDateString() }}</span>
          </span>
        </div>

        <!-- Big Editorial Title in Instrument Serif -->
        <h1 class="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1.1]">
          {{ asset.title }}
        </h1>

        <!-- Author Byline & Rating Meta -->
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6 pt-2">
          <!-- Author Info -->
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold">
              {{ asset.seller?.name?.charAt(0).toUpperCase() || 'C' }}
            </div>
            <div>
              <div class="flex items-center gap-1.5 text-xs">
                <span class="font-bold text-text-primary">{{ asset.seller?.name }}</span>
                <CheckCircle2
                  v-if="asset.seller?.isVerifiedSeller"
                  class="h-3.5 w-3.5 text-secondary"
                  title="Verified Creator"
                />
              </div>
              <p class="text-[11px] text-text-secondary">Verified Asset Creator</p>
            </div>
          </div>

          <!-- Social Proof & Stats -->
          <div class="flex items-center gap-6 text-xs text-text-secondary">
            <div class="flex items-center gap-1.5">
              <Star class="h-4 w-4 fill-amber-400 text-amber-400" />
              <span class="font-bold text-text-primary text-sm font-mono">
                {{ asset.ratingAvg ? Number(asset.ratingAvg).toFixed(1) : '5.0' }}
              </span>
              <span class="text-[11px]">({{ asset.ratingCount || 12 }} reviews)</span>
            </div>

            <div class="flex items-center gap-1.5">
              <Download class="h-4 w-4 text-secondary" />
              <span class="font-bold text-text-primary text-sm font-mono">
                {{ asset.downloadCount || 0 }}
              </span>
              <span class="text-[11px]">downloads</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Two-Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <!-- LEFT COLUMN: Media Showcase & Tabs (8 Cols) -->
        <div class="lg:col-span-8 space-y-8">
          <!-- Main Preview Hero Media -->
          <div class="group relative overflow-hidden rounded-3xl border border-border bg-elevated shadow-2xl">
            <div class="aspect-video w-full overflow-hidden bg-background">
              <img
                :src="formattedThumbnail"
                :alt="asset.title"
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                @error="handleImageFallback($event, asset.title, asset.category?.name || asset.assetType)"
              />
            </div>

            <!-- Live Demo Floating Action Button -->
            <div
              v-if="asset.demoUrl"
              class="absolute bottom-4 right-4"
            >
              <a
                :href="asset.demoUrl"
                target="_blank"
                rel="noreferrer"
                class="inline-flex items-center gap-2 rounded-2xl bg-background/90 px-4 py-2 text-xs font-semibold text-text-primary backdrop-blur-md border border-border shadow-lg hover:border-primary transition"
              >
                <span>Live Interactive Preview</span>
                <ExternalLink class="h-3.5 w-3.5 text-primary" />
              </a>
            </div>
          </div>

          <!-- Navigation Content Tabs -->
          <div class="border-b border-border flex items-center gap-8 text-sm">
            <button
              class="pb-3 font-semibold transition border-b-2"
              :class="
                activeTab === 'description'
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              "
              @click="activeTab = 'description'"
            >
              Product Overview
            </button>

            <button
              class="pb-3 font-semibold transition border-b-2"
              :class="
                activeTab === 'files'
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              "
              @click="activeTab = 'files'"
            >
              Included Deliverables ({{ asset.files?.length || 1 }})
            </button>

            <button
              class="pb-3 font-semibold transition border-b-2"
              :class="
                activeTab === 'license'
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              "
              @click="activeTab = 'license'"
            >
              Commercial License
            </button>
          </div>

          <!-- Tab 1: Detailed Description -->
          <div v-if="activeTab === 'description'" class="space-y-6">
            <div class="prose prose-invert max-w-none text-text-secondary leading-relaxed text-sm space-y-4">
              <h3 class="font-heading text-2xl font-bold text-text-primary">
                About this Asset
              </h3>
              <p class="whitespace-pre-line text-text-secondary leading-loose">
                {{ asset.description }}
              </p>
            </div>

            <!-- Features Highlights Box -->
            <div class="rounded-3xl border border-border bg-elevated/70 p-6 space-y-4">
              <h4 class="font-heading text-xl font-bold text-text-primary flex items-center gap-2">
                <Sparkles class="h-5 w-5 text-secondary" />
                <span>What's Included & Highlights</span>
              </h4>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
                  <span>Full source code and modular components</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
                  <span>Production-ready clean TypeScript architecture</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
                  <span>Dark mode default with tailored tokens</span>
                </div>
                <div class="flex items-center gap-2">
                  <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
                  <span>Lifetime updates & creator support</span>
                </div>
              </div>
            </div>

            <!-- Tags Section -->
            <div class="pt-2">
              <div class="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                Tags & Keywords
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in asset.tags"
                  :key="tag"
                  class="rounded-xl border border-border bg-elevated px-3 py-1 text-xs text-text-secondary"
                >
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Tab 2: Included Deliverables -->
          <div v-else-if="activeTab === 'files'" class="space-y-4">
            <h3 class="font-heading text-2xl font-bold text-text-primary">
              Package Deliverables
            </h3>
            <p class="text-xs text-text-secondary">
              The following files are packaged in this digital asset and will be instantly available upon checkout.
            </p>

            <div class="space-y-3">
              <div
                v-for="file in asset.files || []"
                :key="file.id"
                class="flex items-center justify-between rounded-2xl border border-border bg-elevated p-4"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                    <FileArchive class="h-5 w-5" />
                  </div>
                  <div>
                    <h5 class="font-mono text-xs font-bold text-text-primary">{{ file.fileName }}</h5>
                    <p class="text-[11px] text-text-secondary">Version {{ file.version || '1.0.0' }}</p>
                  </div>
                </div>

                <div class="text-right text-xs font-mono text-text-secondary">
                  {{ formatFileSize(file.fileSizeBytes) }}
                </div>
              </div>

              <!-- Fallback if files empty -->
              <div
                v-if="!asset.files || asset.files.length === 0"
                class="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-4 text-xs text-text-secondary"
              >
                <FileArchive class="h-5 w-5 text-secondary" />
                <span>Primary ZIP Archive Bundle</span>
              </div>
            </div>
          </div>

          <!-- Tab 3: License Terms -->
          <div v-else class="rounded-3xl border border-border bg-elevated/70 p-6 space-y-4 text-xs text-text-secondary leading-relaxed">
            <h3 class="font-heading text-2xl font-bold text-text-primary">
              Standard Commercial License
            </h3>
            <p>
              By purchasing this digital asset, you are granted a non-exclusive, worldwide, royalty-free license to utilize the assets in commercial and personal projects.
            </p>
            <ul class="list-disc pl-5 space-y-1">
              <li>Use for unlimited personal and client projects.</li>
              <li>Integrate into commercial web or mobile applications.</li>
              <li>Resale or redistribution of raw asset files as a standalone item is strictly prohibited.</li>
            </ul>
          </div>
        </div>

        <!-- RIGHT COLUMN: Sticky Purchasing & Specs Sidebar (4 Cols) -->
        <aside class="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          <!-- Main Purchasing Card -->
          <div class="overflow-hidden rounded-3xl border border-border bg-elevated/90 p-6 shadow-2xl backdrop-blur-xl space-y-6">
            <!-- Price Display -->
            <div class="border-b border-border pb-5">
              <span class="text-xs uppercase tracking-wider text-text-secondary">One-time Investment</span>
              <div class="flex items-baseline gap-3 mt-1">
                <span class="text-4xl font-bold text-text-primary font-mono">
                  {{ formattedPrice }}
                </span>
                <span
                  v-if="formattedOriginalPrice"
                  class="text-sm text-text-secondary line-through font-mono"
                >
                  {{ formattedOriginalPrice }}
                </span>
              </div>
              <p class="mt-1 text-[11px] text-text-secondary">
                Includes lifetime updates and commercial rights.
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="space-y-3">
              <!-- FREE ASSET: Direct Claim Button -->
              <button
                v-if="isFree"
                :disabled="isClaiming"
                class="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 text-xs font-semibold text-white shadow-xl shadow-secondary/25 hover:bg-secondary-hover transition transform active:scale-[0.98] disabled:opacity-50"
                @click="handleClaimFree"
              >
                <Loader2 v-if="isClaiming" class="h-4 w-4 animate-spin" />
                <template v-else>
                  <Download class="h-4 w-4" />
                  <span>Klaim & Unduh Gratis Sekarang</span>
                </template>
              </button>

              <!-- PAID ASSET: Instant Checkout & Add to Cart -->
              <template v-else>
                <button
                  class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-semibold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover transition transform active:scale-[0.98]"
                  @click="handleInstantBuy"
                >
                  <Zap class="h-4 w-4" />
                  <span>Instant Checkout</span>
                </button>

                <button
                  class="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-xs font-semibold text-text-primary hover:border-border-hover transition"
                  :class="isInCart ? 'border-success text-success bg-success/10' : ''"
                  @click="handleAddToCart"
                >
                  <ShoppingBag class="h-4 w-4" />
                  <span>{{ isInCart ? 'Added to Cart' : 'Add to Cart' }}</span>
                </button>
              </template>
            </div>

            <!-- 60/40 Creator Monetization Guarantee -->
            <div class="rounded-2xl border border-secondary/30 bg-secondary/5 p-4 flex items-start gap-3">
              <ShieldCheck class="h-5 w-5 text-secondary shrink-0 mt-0.5" />
              <div class="text-[11px] text-text-secondary leading-relaxed">
                <strong class="text-text-primary">Creator Supported:</strong>
                60% of this purchase goes directly to {{ asset.seller?.name }}. Transparent and verified.
              </div>
            </div>

            <!-- Key Deliverable Attributes -->
            <div class="space-y-2.5 text-xs border-t border-border pt-4">
              <div class="flex justify-between">
                <span class="text-text-secondary">Package Size</span>
                <span class="font-mono text-text-primary font-medium">{{ totalDeliverableSize }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary">Format</span>
                <span class="text-text-primary font-medium uppercase font-mono">{{ asset.assetType }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary">Delivery</span>
                <span class="text-success font-medium">Instant Download</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-secondary">License</span>
                <span class="text-text-primary font-medium">Commercial</span>
              </div>
            </div>
          </div>

          <!-- Creator Profile Card -->
          <div class="rounded-3xl border border-border bg-elevated/70 p-6 space-y-4">
            <h4 class="font-heading text-lg font-bold text-text-primary">
              Created by
            </h4>
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-background font-bold text-lg">
                {{ asset.seller?.name?.charAt(0).toUpperCase() || 'C' }}
              </div>
              <div>
                <h5 class="text-xs font-bold text-text-primary flex items-center gap-1">
                  {{ asset.seller?.name }}
                  <CheckCircle2 class="h-3.5 w-3.5 text-secondary" />
                </h5>
                <p class="text-[11px] text-text-secondary">Member since {{ new Date(asset.seller?.createdAt || Date.now()).getFullYear() }}</p>
              </div>
            </div>
            <p v-if="asset.seller?.bio" class="text-xs text-text-secondary leading-relaxed">
              {{ asset.seller.bio }}
            </p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
