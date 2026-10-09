<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { assetService } from '../services/assets';
import AssetCard from '../components/AssetCard.vue';
import AssetCardSkeleton from '../components/AssetCardSkeleton.vue';
import EmptyState from '../components/EmptyState.vue';
import type { Asset, Category, Pagination } from '../types';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layout,
  Code2,
  Box,
  Palette,
  Music2,
  AlertCircle,
  ChevronsLeft,
  ChevronsRight,
  X,
  Coins,
  Gift,
  Layers,
  ArrowUpDown,
  Tag,
  Check,
  Grid3X3,
  LayoutList,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// State
const assets = ref<Asset[]>([]);
const categories = ref<Category[]>([]);
const pagination = ref<Pagination>({
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 1,
});

const isLoading = ref(true);
const isError = ref(false);
const errorMessage = ref<string | null>(null);
const mobileFilterOpen = ref(false);

// Search
const searchQuery = ref((route.query.q as string) || (route.query.search as string) || '');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Filters
const filters = reactive({
  category: (route.query.category as string) || 'all',
  type: (route.query.type as string) || 'all',
  pricing: (route.query.pricing as 'all' | 'free' | 'paid') || 'all',
  q: (route.query.q as string) || (route.query.search as string) || '',
  minPrice:
    route.query.minPrice !== undefined && route.query.minPrice !== ''
      ? Number(route.query.minPrice)
      : (undefined as number | undefined),
  maxPrice:
    route.query.maxPrice !== undefined && route.query.maxPrice !== ''
      ? Number(route.query.maxPrice)
      : (undefined as number | undefined),
  sort: (route.query.sort as string) || 'newest',
  page: route.query.page ? Number(route.query.page) : 1,
});

const localMinPrice = ref<number | undefined>(filters.minPrice);
const localMaxPrice = ref<number | undefined>(filters.maxPrice);

const assetTypes: { id: string; label: string; icon: any }[] = [
  { id: 'all', label: 'All Types', icon: Sparkles },
  { id: 'ui_template', label: 'UI Templates', icon: Layout },
  { id: 'source_code', label: 'Source Code', icon: Code2 },
  { id: '3d_model', label: '3D Models', icon: Box },
  { id: 'graphic', label: 'Graphics', icon: Palette },
  { id: 'audio', label: 'Audio & SFX', icon: Music2 },
];

const pricingOptions: { id: 'all' | 'paid' | 'free'; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'paid', label: 'Paid', icon: Coins },
  { id: 'free', label: 'Free', icon: Gift },
];

const sortOptions = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price ↑' },
  { id: 'price_desc', label: 'Price ↓' },
  { id: 'popular', label: 'Most Downloaded' },
  { id: 'rating', label: 'Top Rated' },
];

const pricePresets = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under Rp 200k', min: undefined, max: 200000 },
  { label: 'Rp 200k – 500k', min: 200000, max: 500000 },
  { label: 'Above Rp 500k', min: 500000, max: undefined },
];

const hasActiveFilters = computed(() => {
  return (
    filters.category !== 'all' ||
    filters.type !== 'all' ||
    filters.pricing !== 'all' ||
    filters.q.trim() !== '' ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  );
});

const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.category !== 'all') count++;
  if (filters.type !== 'all') count++;
  if (filters.pricing !== 'all') count++;
  if (filters.q.trim() !== '') count++;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
  return count;
});

const currentCategoryName = computed(() => {
  if (filters.category === 'all') return 'All';
  const found = categories.value.find(
    (c) => c.slug === filters.category || c.id === filters.category
  );
  return found ? found.name : filters.category;
});

const currentTypeName = computed(() => {
  const found = assetTypes.find((t) => t.id === filters.type);
  return found ? found.label : filters.type;
});

onMounted(async () => {
  await Promise.all([loadCategories(), fetchAssets()]);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

watch(
  () => route.query,
  () => {
    filters.category = (route.query.category as string) || 'all';
    filters.type = (route.query.type as string) || 'all';
    filters.pricing = (route.query.pricing as 'all' | 'free' | 'paid') || 'all';
    filters.q = (route.query.q as string) || (route.query.search as string) || '';
    searchQuery.value = filters.q;
    filters.minPrice =
      route.query.minPrice !== undefined && route.query.minPrice !== ''
        ? Number(route.query.minPrice)
        : undefined;
    filters.maxPrice =
      route.query.maxPrice !== undefined && route.query.maxPrice !== ''
        ? Number(route.query.maxPrice)
        : undefined;
    localMinPrice.value = filters.minPrice;
    localMaxPrice.value = filters.maxPrice;
    filters.sort = (route.query.sort as string) || 'newest';
    filters.page = route.query.page ? Number(route.query.page) : 1;
    fetchAssets();
  }
);

async function loadCategories() {
  try {
    categories.value = await assetService.getCategories();
  } catch (err) {
    console.error('Failed to load categories', err);
  }
}

async function fetchAssets() {
  isLoading.value = true;
  isError.value = false;
  errorMessage.value = null;

  try {
    const params: any = {
      page: filters.page,
      limit: pagination.value.limit,
      sort: filters.sort,
    };

    if (filters.category && filters.category !== 'all') params.category = filters.category;
    if (filters.type && filters.type !== 'all') params.type = filters.type;
    if (filters.pricing && filters.pricing !== 'all') params.pricing = filters.pricing;
    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.minPrice !== undefined) params.minPrice = filters.minPrice;
    if (filters.maxPrice !== undefined) params.maxPrice = filters.maxPrice;

    const result = await assetService.getPublicAssets(params);
    assets.value = result.assets;
    pagination.value = result.pagination;
  } catch (err: any) {
    console.error('Fetch assets error:', err);
    isError.value = true;
    errorMessage.value = err?.message || 'Unable to load marketplace catalog.';
  } finally {
    isLoading.value = false;
  }
}

function updateQueryParams() {
  const query: Record<string, string | number> = {};

  if (filters.category && filters.category !== 'all') query.category = filters.category;
  if (filters.type && filters.type !== 'all') query.type = filters.type;
  if (filters.pricing && filters.pricing !== 'all') query.pricing = filters.pricing;
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.minPrice !== undefined) query.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) query.maxPrice = filters.maxPrice;
  if (filters.sort !== 'newest') query.sort = filters.sort;
  if (filters.page > 1) query.page = filters.page;

  router.push({ query });
}

function onSearchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const val = target.value;
  searchQuery.value = val;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (filters.q !== val.trim()) {
      filters.q = val.trim();
      filters.page = 1;
      updateQueryParams();
    }
  }, 350);
}

function handleSearchImmediate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (filters.q !== searchQuery.value.trim()) {
    filters.q = searchQuery.value.trim();
    filters.page = 1;
    updateQueryParams();
  }
}

function clearSearch() {
  if (debounceTimer) clearTimeout(debounceTimer);
  searchQuery.value = '';
  if (filters.q !== '') {
    filters.q = '';
    filters.page = 1;
    updateQueryParams();
  }
}

function applyCategory(slug: string) {
  filters.category = slug;
  filters.page = 1;
  updateQueryParams();
}

function applyType(typeId: string) {
  filters.type = typeId;
  filters.page = 1;
  updateQueryParams();
}

function applyPricing(pricingId: 'all' | 'free' | 'paid') {
  filters.pricing = pricingId;
  filters.page = 1;
  updateQueryParams();
}

function applyPricePreset(min?: number, max?: number) {
  localMinPrice.value = min;
  localMaxPrice.value = max;
  filters.minPrice = min;
  filters.maxPrice = max;
  filters.page = 1;
  updateQueryParams();
}

function applyCustomPrice() {
  let min = localMinPrice.value;
  let max = localMaxPrice.value;
  if (min !== undefined && min < 0) min = 0;
  if (max !== undefined && max < 0) max = 0;
  if (min !== undefined && max !== undefined && min > max) {
    const temp = min;
    min = max;
    max = temp;
    localMinPrice.value = min;
    localMaxPrice.value = max;
  }
  filters.minPrice = min;
  filters.maxPrice = max;
  filters.page = 1;
  updateQueryParams();
}

function clearPriceFilter() {
  localMinPrice.value = undefined;
  localMaxPrice.value = undefined;
  filters.minPrice = undefined;
  filters.maxPrice = undefined;
  filters.page = 1;
  updateQueryParams();
}

function handleSortChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  filters.sort = target.value;
  filters.page = 1;
  updateQueryParams();
}

function goToPage(p: number) {
  if (p >= 1 && p <= pagination.value.totalPages) {
    filters.page = p;
    updateQueryParams();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function resetAllFilters() {
  if (debounceTimer) clearTimeout(debounceTimer);
  searchQuery.value = '';
  filters.category = 'all';
  filters.type = 'all';
  filters.pricing = 'all';
  filters.q = '';
  filters.minPrice = undefined;
  filters.maxPrice = undefined;
  localMinPrice.value = undefined;
  localMaxPrice.value = undefined;
  filters.sort = 'newest';
  filters.page = 1;
  updateQueryParams();
}

function formatPriceShort(val?: number): string {
  if (val === undefined) return '';
  if (val >= 1000000) return `Rp ${(val / 1000000).toLocaleString('id-ID')}jt`;
  if (val >= 1000) return `Rp ${(val / 1000).toLocaleString('id-ID')}rb`;
  return `Rp ${val.toLocaleString('id-ID')}`;
}

function visiblePages(): number[] {
  const total = pagination.value.totalPages;
  const current = pagination.value.page;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
</script>

<template>
  <div class="min-h-screen">

    <!-- ═══════════════════════════════
         HERO: Editorial Masthead
         ═══════════════════════════════ -->
    <div class="relative overflow-hidden border-b border-border/30">
      <!-- Subtle background texture -->
      <div class="absolute inset-0 opacity-[0.03]"
        style="background-image: radial-gradient(circle at 1px 1px, #F5F2ED 1px, transparent 0); background-size: 28px 28px;">
      </div>
      <!-- Gradient accent line -->
      <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>

      <div class="relative mx-auto max-w-[1440px] px-6 lg:px-12 pt-14 pb-8">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-8">

          <!-- Left: Typography -->
          <div class="max-w-xl">
            <!-- Eyebrow -->
            <div class="inline-flex items-center gap-2.5 mb-5">
              <div class="h-px w-8 bg-secondary"></div>
              <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">Curated Marketplace</span>
            </div>
            <!-- Headline -->
            <h1 class="font-heading text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-bold text-text-primary leading-[0.88] tracking-tight">
              Explore<br />
              <span class="text-primary italic">Digital Assets</span>
            </h1>
            <!-- Sub -->
            <p class="mt-4 text-[13px] text-text-secondary max-w-sm leading-[1.75]">
              Premium source code, UI kits, 3D models, graphics &amp; audio — all verified by our team.
            </p>
          </div>

          <!-- Right: Stats + Search -->
          <div class="flex flex-col items-start lg:items-end gap-5 w-full lg:w-auto">
            <!-- Live stats bar -->
            <div class="flex items-center gap-6">
              <div class="text-right">
                <p class="font-heading text-2xl font-bold text-text-primary tabular-nums">{{ pagination.total.toLocaleString() }}</p>
                <p class="text-[10px] text-text-muted uppercase tracking-wider">Assets</p>
              </div>
              <div class="h-8 w-px bg-border/50"></div>
              <div class="text-right">
                <p class="font-heading text-2xl font-bold text-text-primary tabular-nums">{{ categories.length }}</p>
                <p class="text-[10px] text-text-muted uppercase tracking-wider">Categories</p>
              </div>
            </div>

            <!-- Search bar -->
            <div class="relative w-full lg:w-[380px] group">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search class="h-4 w-4 text-text-muted group-focus-within:text-secondary transition-colors" />
              </div>
              <input
                :value="searchQuery"
                type="text"
                placeholder="Search assets, tags, or creators..."
                class="w-full rounded-2xl border border-border/50 bg-elevated/80 py-3.5 pl-11 pr-10 text-[13px] text-text-primary placeholder-text-muted/60 focus:border-secondary/50 focus:outline-none focus:ring-2 focus:ring-secondary/15 transition-all duration-200"
                @input="onSearchInput"
                @keyup.enter="handleSearchImmediate"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border/60 transition"
                @click="clearSearch"
              >
                <X class="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════
         CATEGORY PILLS NAV
         ═══════════════════════════════ -->
    <div class="border-b border-border/30 bg-elevated/30">
      <div class="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-3">
          <!-- All -->
          <button
            class="shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap"
            :class="
              filters.category === 'all'
                ? 'bg-text-primary text-background shadow-lg shadow-black/20'
                : 'text-text-secondary hover:text-text-primary border border-transparent hover:border-border/50'
            "
            @click="applyCategory('all')"
          >
            All Assets
          </button>

          <button
            v-for="cat in categories"
            :key="cat.id"
            class="shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200 whitespace-nowrap inline-flex items-center gap-2"
            :class="
              filters.category === cat.slug || filters.category === cat.id
                ? 'bg-text-primary text-background shadow-lg shadow-black/20'
                : 'text-text-secondary hover:text-text-primary border border-transparent hover:border-border/50'
            "
            @click="applyCategory(cat.slug)"
          >
            {{ cat.name }}
            <span
              v-if="cat.assetCount !== undefined && cat.assetCount > 0"
              class="text-[9px] opacity-50 tabular-nums"
            >
              {{ cat.assetCount }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════
         MAIN LAYOUT
         ═══════════════════════════════ -->
    <div class="mx-auto max-w-[1440px] px-6 lg:px-12 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] gap-8 xl:gap-10 items-start">

        <!-- ═══ SIDEBAR ═══ -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-4">

            <!-- Filter Card -->
            <div class="rounded-2xl border border-border/40 bg-elevated/60 p-5">

              <!-- Header -->
              <div class="flex items-center justify-between pb-4 mb-4 border-b border-border/30">
                <div class="flex items-center gap-2.5">
                  <SlidersHorizontal class="h-4 w-4 text-secondary" />
                  <span class="text-[12px] font-bold text-text-primary">Filters</span>
                  <span
                    v-if="activeFilterCount > 0"
                    class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/20 text-secondary text-[10px] font-bold"
                  >
                    {{ activeFilterCount }}
                  </span>
                </div>
                <button
                  v-if="hasActiveFilters"
                  class="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-primary transition-colors font-medium"
                  @click="resetAllFilters"
                >
                  <RotateCcw class="h-3 w-3" />
                  Reset
                </button>
              </div>

              <!-- Pricing Toggle -->
              <div class="mb-5">
                <p class="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2.5">Pricing</p>
                <div class="grid grid-cols-3 gap-1 rounded-xl bg-background/80 p-1 border border-border/30">
                  <button
                    v-for="opt in pricingOptions"
                    :key="opt.id"
                    type="button"
                    class="flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-semibold transition-all duration-150"
                    :class="
                      filters.pricing === opt.id
                        ? 'bg-elevated text-secondary shadow-sm border border-border/60'
                        : 'text-text-muted hover:text-text-primary'
                    "
                    @click="applyPricing(opt.id)"
                  >
                    <component :is="opt.icon" class="h-3.5 w-3.5 mb-1 opacity-80" />
                    <span>{{ opt.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Asset Type -->
              <div class="mb-5">
                <p class="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted mb-2.5">Type</p>
                <div class="space-y-0.5">
                  <button
                    v-for="t in assetTypes"
                    :key="t.id"
                    type="button"
                    class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[11px] transition-all duration-150"
                    :class="
                      filters.type === t.id
                        ? 'bg-secondary/10 text-secondary font-semibold'
                        : 'text-text-secondary hover:bg-elevated/50 hover:text-text-primary'
                    "
                    @click="applyType(t.id)"
                  >
                    <div class="flex items-center gap-2.5">
                      <component :is="t.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span>{{ t.label }}</span>
                    </div>
                    <Check v-if="filters.type === t.id" class="h-3.5 w-3.5 text-secondary shrink-0" />
                  </button>
                </div>
              </div>

              <!-- Price Range -->
              <div class="pt-4 border-t border-border/30">
                <div class="flex items-center justify-between mb-2.5">
                  <p class="text-[9px] font-bold uppercase tracking-[0.2em] text-text-muted">Price Range</p>
                  <button
                    v-if="filters.minPrice !== undefined || filters.maxPrice !== undefined"
                    class="text-[10px] text-secondary hover:underline"
                    @click="clearPriceFilter"
                  >
                    Clear
                  </button>
                </div>

                <!-- Presets -->
                <div class="space-y-0.5 mb-3">
                  <button
                    v-for="preset in pricePresets"
                    :key="preset.label"
                    type="button"
                    class="w-full text-left rounded-lg px-3 py-1.5 text-[11px] transition-all duration-150"
                    :class="
                      filters.minPrice === preset.min && filters.maxPrice === preset.max
                        ? 'text-secondary font-semibold bg-secondary/10'
                        : 'text-text-secondary hover:bg-elevated/50 hover:text-text-primary'
                    "
                    @click="applyPricePreset(preset.min, preset.max)"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <!-- Custom -->
                <div class="pt-2 border-t border-border/20 space-y-2">
                  <div class="grid grid-cols-2 gap-2">
                    <input
                      v-model.number="localMinPrice"
                      type="number"
                      placeholder="Min"
                      min="0"
                      step="10000"
                      class="w-full rounded-lg border border-border/40 bg-background/80 py-1.5 px-2.5 text-[11px] text-text-primary placeholder-text-muted/50 focus:border-secondary/50 focus:outline-none transition-colors"
                      @keyup.enter="applyCustomPrice"
                    />
                    <input
                      v-model.number="localMaxPrice"
                      type="number"
                      placeholder="Max"
                      min="0"
                      step="10000"
                      class="w-full rounded-lg border border-border/40 bg-background/80 py-1.5 px-2.5 text-[11px] text-text-primary placeholder-text-muted/50 focus:border-secondary/50 focus:outline-none transition-colors"
                      @keyup.enter="applyCustomPrice"
                    />
                  </div>
                  <button
                    type="button"
                    class="w-full rounded-lg bg-elevated/50 hover:bg-border/40 py-1.5 text-[10px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                    @click="applyCustomPrice"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <!-- Trust Badge -->
            <div class="rounded-xl border border-success/20 bg-success/8 p-3.5 flex items-center gap-2.5">
              <div class="h-1.5 w-1.5 rounded-full bg-success shrink-0 animate-pulse"></div>
              <p class="text-[10px] text-success leading-snug font-medium">All assets are curated &amp; admin-verified before listing.</p>
            </div>
          </div>
        </aside>

        <!-- ═══ RESULTS ═══ -->
        <section>

          <!-- Top Bar -->
          <div class="flex items-center justify-between gap-4 mb-5">
            <!-- Result count -->
            <div class="flex items-center gap-3">
              <span v-if="!isLoading && !isError" class="text-[12px] text-text-secondary">
                <span class="font-bold text-text-primary tabular-nums">{{ pagination.total.toLocaleString() }}</span>
                <span class="text-text-muted mx-1">results</span>
                <span v-if="filters.q.trim()" class="inline-flex items-center gap-1 text-secondary">
                  <span>for</span>
                  <span class="font-semibold">"{{ filters.q }}"</span>
                </span>
              </span>
              <span v-else-if="isLoading" class="inline-flex items-center gap-2 text-[12px] text-text-muted">
                <span class="h-1.5 w-1.5 rounded-full bg-secondary animate-ping"></span>
                Loading...
              </span>
            </div>

            <div class="flex items-center gap-3">
              <!-- Sort -->
              <div class="relative flex items-center gap-2">
                <ArrowUpDown class="h-3.5 w-3.5 text-text-muted shrink-0" />
                <select
                  :value="filters.sort"
                  class="rounded-xl border border-border/50 bg-elevated/80 py-1.5 pl-3 pr-7 text-[11px] font-medium text-text-primary focus:border-secondary/50 focus:outline-none focus:ring-1 focus:ring-secondary/20 transition cursor-pointer appearance-none"
                  @change="handleSortChange"
                >
                  <option v-for="opt in sortOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
                </select>
                <ChevronRight class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted rotate-90" />
              </div>

              <!-- Mobile filter button -->
              <button
                type="button"
                class="lg:hidden relative flex items-center gap-2 rounded-xl border border-border/50 bg-elevated/80 px-3.5 py-1.5 text-[11px] font-semibold text-text-primary hover:border-border transition-colors"
                @click="mobileFilterOpen = true"
              >
                <SlidersHorizontal class="h-3.5 w-3.5 text-secondary" />
                <span>Filters</span>
                <span
                  v-if="activeFilterCount > 0"
                  class="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-background"
                >
                  {{ activeFilterCount }}
                </span>
              </button>
            </div>
          </div>

          <!-- Active Filter Strip -->
          <div
            v-if="hasActiveFilters"
            class="flex flex-wrap items-center gap-2 mb-5"
          >
            <span
              v-if="filters.q.trim()"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated/80 border border-border/50 px-3 py-1 text-[11px] text-text-primary"
            >
              <Search class="h-3 w-3 text-secondary" />
              <span>"{{ filters.q }}"</span>
              <button class="ml-0.5 hover:text-primary transition-colors" @click="clearSearch">
                <X class="h-3 w-3" />
              </button>
            </span>

            <span
              v-if="filters.category !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated/80 border border-border/50 px-3 py-1 text-[11px] text-text-primary"
            >
              <Tag class="h-3 w-3 text-secondary" />
              <span>{{ currentCategoryName }}</span>
              <button class="ml-0.5 hover:text-primary transition-colors" @click="applyCategory('all')">
                <X class="h-3 w-3" />
              </button>
            </span>

            <span
              v-if="filters.type !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated/80 border border-border/50 px-3 py-1 text-[11px] text-text-primary"
            >
              <Sparkles class="h-3 w-3 text-secondary" />
              <span>{{ currentTypeName }}</span>
              <button class="ml-0.5 hover:text-primary transition-colors" @click="applyType('all')">
                <X class="h-3 w-3" />
              </button>
            </span>

            <span
              v-if="filters.pricing !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated/80 border border-border/50 px-3 py-1 text-[11px] text-text-primary"
            >
              <Coins v-if="filters.pricing === 'paid'" class="h-3 w-3 text-secondary" />
              <Gift v-else class="h-3 w-3 text-secondary" />
              <span>{{ filters.pricing === 'free' ? 'Free' : 'Paid' }}</span>
              <button class="ml-0.5 hover:text-primary transition-colors" @click="applyPricing('all')">
                <X class="h-3 w-3" />
              </button>
            </span>

            <span
              v-if="filters.minPrice !== undefined || filters.maxPrice !== undefined"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated/80 border border-border/50 px-3 py-1 text-[11px] text-text-primary"
            >
              <span>
                {{ filters.minPrice !== undefined ? formatPriceShort(filters.minPrice) : 'Rp 0' }}
                –
                {{ filters.maxPrice !== undefined ? formatPriceShort(filters.maxPrice) : '∞' }}
              </span>
              <button class="ml-0.5 hover:text-primary transition-colors" @click="clearPriceFilter">
                <X class="h-3 w-3" />
              </button>
            </span>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-[11px] text-secondary hover:text-secondary-hover font-semibold ml-1 transition-colors"
              @click="resetAllFilters"
            >
              <RotateCcw class="h-3 w-3" />
              Clear all
            </button>
          </div>

          <!-- Loading Skeleton -->
          <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-6">
            <AssetCardSkeleton v-for="n in 9" :key="n" />
          </div>

          <!-- Error State -->
          <div
            v-else-if="isError"
            class="rounded-2xl border border-primary/20 bg-primary/5 p-16 text-center"
          >
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <AlertCircle class="h-7 w-7 text-primary" />
            </div>
            <h3 class="font-heading text-2xl font-bold text-text-primary mb-2">Failed to Load</h3>
            <p class="max-w-md mx-auto text-[13px] text-text-secondary leading-relaxed mb-6">
              {{ errorMessage }}
            </p>
            <button
              type="button"
              class="rounded-xl bg-primary px-6 py-2.5 text-[12px] text-white font-semibold shadow-lg shadow-primary/20 hover:bg-primary-hover transition"
              @click="fetchAssets"
            >
              Try Again
            </button>
          </div>

          <!-- Empty State -->
          <EmptyState
            v-else-if="assets.length === 0"
            icon="search"
            icon-color="secondary"
            title="Tidak Ada Aset Ditemukan"
            description="Tidak ada aset yang cocok dengan filter saat ini. Coba kata kunci lain atau reset filter."
            action-text="Reset Filter"
            :action-icon="RotateCcw"
            action-variant="secondary"
            @action="resetAllFilters"
          />

          <!-- Asset Grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 xl:gap-6">
            <div
              v-for="(item, index) in assets"
              :key="item.id"
              class="animate-fade-in-up"
              :style="{ animationDelay: `${index * 35}ms` }"
            >
              <AssetCard :asset="item" />
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="pagination.totalPages > 1 && !isLoading"
            class="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/30"
          >
            <p class="text-[11px] text-text-muted">
              Page
              <span class="font-bold text-text-primary tabular-nums">{{ pagination.page }}</span>
              of
              <span class="font-bold text-text-primary tabular-nums">{{ pagination.totalPages }}</span>
            </p>

            <div class="flex items-center gap-1">
              <!-- First -->
              <button
                v-if="pagination.totalPages > 5 && pagination.page > 3"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] text-text-muted hover:text-text-primary hover:bg-elevated/50 transition"
                @click="goToPage(1)"
              >
                <ChevronsLeft class="h-3.5 w-3.5" />
              </button>

              <!-- Prev -->
              <button
                type="button"
                :disabled="pagination.page <= 1"
                class="flex h-8 items-center gap-1 rounded-lg border border-border/40 bg-elevated/60 px-2.5 text-[11px] font-medium text-text-primary hover:border-border disabled:opacity-30 disabled:pointer-events-none transition"
                @click="goToPage(pagination.page - 1)"
              >
                <ChevronLeft class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">Prev</span>
              </button>

              <!-- Pages -->
              <div class="flex items-center gap-0.5">
                <button
                  v-for="p in visiblePages()"
                  :key="p"
                  type="button"
                  class="h-8 w-8 rounded-lg text-[11px] font-medium transition-all duration-150"
                  :class="
                    pagination.page === p
                      ? 'bg-text-primary text-background font-bold shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-elevated/50'
                  "
                  @click="goToPage(p)"
                >
                  {{ p }}
                </button>
              </div>

              <!-- Next -->
              <button
                type="button"
                :disabled="pagination.page >= pagination.totalPages"
                class="flex h-8 items-center gap-1 rounded-lg border border-border/40 bg-elevated/60 px-2.5 text-[11px] font-medium text-text-primary hover:border-border disabled:opacity-30 disabled:pointer-events-none transition"
                @click="goToPage(pagination.page + 1)"
              >
                <span class="hidden sm:inline">Next</span>
                <ChevronRight class="h-3.5 w-3.5" />
              </button>

              <!-- Last -->
              <button
                v-if="pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2"
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] text-text-muted hover:text-text-primary hover:bg-elevated/50 transition"
                @click="goToPage(pagination.totalPages)"
              >
                <ChevronsRight class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ═══════════════════════════════
         MOBILE FILTER DRAWER
         ═══════════════════════════════ -->
    <div
      v-if="mobileFilterOpen"
      class="fixed inset-0 z-50 lg:hidden flex justify-end animate-fade-in"
    >
      <div
        class="fixed inset-0 bg-background/70 backdrop-blur-sm transition-opacity"
        @click="mobileFilterOpen = false"
      ></div>

      <div class="relative w-full max-w-xs bg-elevated-card border-l border-border/50 h-full flex flex-col shadow-2xl z-10 overflow-hidden">
        <!-- Drawer header -->
        <div class="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
          <div class="flex items-center gap-2.5">
            <SlidersHorizontal class="h-4.5 w-4.5 text-secondary" />
            <span class="text-[13px] font-bold text-text-primary">Filters</span>
            <span
              v-if="activeFilterCount > 0"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/20 text-secondary text-[10px] font-bold"
            >
              {{ activeFilterCount }}
            </span>
          </div>
          <button
            type="button"
            class="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-elevated/50 transition"
            @click="mobileFilterOpen = false"
          >
            <X class="h-4.5 w-4.5" />
          </button>
        </div>

        <!-- Drawer body -->
        <div class="p-5 space-y-5 overflow-y-auto flex-1">

          <!-- Pricing -->
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">Pricing</p>
            <div class="grid grid-cols-3 gap-1 rounded-xl bg-background/80 p-1 border border-border/30">
              <button
                v-for="opt in pricingOptions"
                :key="opt.id"
                type="button"
                class="flex flex-col items-center justify-center py-2 rounded-lg text-[10px] font-semibold transition-all"
                :class="
                  filters.pricing === opt.id
                    ? 'bg-elevated text-secondary border border-border/60'
                    : 'text-text-muted hover:text-text-primary'
                "
                @click="applyPricing(opt.id)"
              >
                <component :is="opt.icon" class="h-3.5 w-3.5 mb-1 opacity-80" />
                <span>{{ opt.label }}</span>
              </button>
            </div>
          </div>

          <!-- Category -->
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">Category</p>
            <div class="space-y-0.5 max-h-40 overflow-y-auto pr-1">
              <button
                v-for="cat in [{ id: 'all', slug: 'all', name: 'All Categories', assetCount: undefined }, ...categories]"
                :key="cat.id"
                type="button"
                class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[11px] transition-all"
                :class="
                  filters.category === cat.slug
                    ? 'bg-secondary/10 text-secondary font-semibold'
                    : 'text-text-secondary hover:bg-elevated/50'
                "
                @click="applyCategory(cat.slug)"
              >
                <span>{{ cat.name }}</span>
                <Check v-if="filters.category === cat.slug" class="h-3.5 w-3.5 text-secondary" />
              </button>
            </div>
          </div>

          <!-- Asset Type -->
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">Type</p>
            <div class="space-y-0.5">
              <button
                v-for="t in assetTypes"
                :key="t.id"
                type="button"
                class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[11px] transition-all"
                :class="
                  filters.type === t.id
                    ? 'bg-secondary/10 text-secondary font-semibold'
                    : 'text-text-secondary hover:bg-elevated/50'
                "
                @click="applyType(t.id)"
              >
                <div class="flex items-center gap-2.5">
                  <component :is="t.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>{{ t.label }}</span>
                </div>
                <Check v-if="filters.type === t.id" class="h-3.5 w-3.5 text-secondary" />
              </button>
            </div>
          </div>

          <!-- Price Range -->
          <div class="pt-4 border-t border-border/30">
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">Price Range</p>
            <div class="space-y-0.5 mb-3">
              <button
                v-for="preset in pricePresets"
                :key="preset.label"
                type="button"
                class="w-full text-left rounded-lg px-3 py-1.5 text-[11px] transition-all"
                :class="
                  filters.minPrice === preset.min && filters.maxPrice === preset.max
                    ? 'text-secondary font-semibold bg-secondary/10'
                    : 'text-text-secondary hover:bg-elevated/50'
                "
                @click="applyPricePreset(preset.min, preset.max)"
              >
                {{ preset.label }}
              </button>
            </div>
            <div class="space-y-2 pt-2 border-t border-border/20">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.number="localMinPrice"
                  type="number"
                  placeholder="Min (Rp)"
                  min="0"
                  class="w-full rounded-lg border border-border/40 bg-background/80 py-2 px-2.5 text-[11px] text-text-primary placeholder-text-muted/50 focus:border-secondary/50 focus:outline-none transition-colors"
                />
                <input
                  v-model.number="localMaxPrice"
                  type="number"
                  placeholder="Max (Rp)"
                  min="0"
                  class="w-full rounded-lg border border-border/40 bg-background/80 py-2 px-2.5 text-[11px] text-text-primary placeholder-text-muted/50 focus:border-secondary/50 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="button"
                class="w-full rounded-lg bg-elevated/50 py-2 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
                @click="applyCustomPrice"
              >
                Apply Price
              </button>
            </div>
          </div>
        </div>

        <!-- Drawer footer -->
        <div class="p-4 border-t border-border/40 bg-elevated/60 shrink-0 flex items-center gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-border/50 py-2.5 text-[12px] font-semibold text-text-muted hover:text-text-primary transition-colors"
            @click="resetAllFilters"
          >
            Reset
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-secondary py-2.5 text-[12px] font-bold text-background shadow-lg shadow-secondary/10 hover:bg-secondary-hover transition"
            @click="mobileFilterOpen = false"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>

  </div>
</template>
