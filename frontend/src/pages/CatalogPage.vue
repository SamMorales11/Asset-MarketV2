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
  Filter,
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

// Search input model with debounce
const searchQuery = ref((route.query.q as string) || (route.query.search as string) || '');
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Filter Form State (synced with URL)
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

// Custom price input local values
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
  { id: 'all', label: 'All Assets', icon: Layers },
  { id: 'paid', label: 'Paid Only', icon: Coins },
  { id: 'free', label: 'Free Only', icon: Gift },
];

const sortOptions = [
  { id: 'newest', label: 'Newest First' },
  { id: 'price_asc', label: 'Price: Low → High' },
  { id: 'price_desc', label: 'Price: High → Low' },
  { id: 'popular', label: 'Most Downloaded' },
  { id: 'rating', label: 'Highest Rated' },
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
  if (filters.category === 'all') return 'All Categories';
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
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});

// Watch route query changes for browser back/forward navigation
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

    if (filters.category && filters.category !== 'all') {
      params.category = filters.category;
    }
    if (filters.type && filters.type !== 'all') {
      params.type = filters.type;
    }
    if (filters.pricing && filters.pricing !== 'all') {
      params.pricing = filters.pricing;
    }
    if (filters.q.trim()) {
      params.q = filters.q.trim();
    }
    if (filters.minPrice !== undefined) {
      params.minPrice = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      params.maxPrice = filters.maxPrice;
    }

    const result = await assetService.getPublicAssets(params);
    assets.value = result.assets;
    pagination.value = result.pagination;
  } catch (err: any) {
    console.error('Fetch assets error:', err);
    isError.value = true;
    errorMessage.value = err?.message || 'Failed to retrieve marketplace catalog.';
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

// Debounced live search
function onSearchInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const val = target.value;
  searchQuery.value = val;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    if (filters.q !== val.trim()) {
      filters.q = val.trim();
      filters.page = 1;
      updateQueryParams();
    }
  }, 350);
}

function handleSearchImmediate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (filters.q !== searchQuery.value.trim()) {
    filters.q = searchQuery.value.trim();
    filters.page = 1;
    updateQueryParams();
  }
}

function clearSearch() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  searchQuery.value = '';
  if (filters.q !== '') {
    filters.q = '';
    filters.page = 1;
    updateQueryParams();
  }
}

function applyCategory(catSlug: string) {
  filters.category = catSlug;
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
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
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
  if (val >= 1000000) return `Rp ${(val / 1000000).toLocaleString('id-ID')} jt`;
  if (val >= 1000) return `Rp ${(val / 1000).toLocaleString('id-ID')} rb`;
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
    <!-- ═══════════════════════════════════════════════
         EDITORIAL HERO HEADER
         ═══════════════════════════════════════════════ -->
    <div class="border-b border-border/40">
      <div class="mx-auto max-w-[1440px] px-6 lg:px-12 pt-12 pb-10">
        <!-- Eyebrow + Headline + Search Bar -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">
          <div class="max-w-2xl">
            <div class="inline-flex items-center gap-2.5 text-[10px] font-bold text-secondary uppercase tracking-[0.25em] mb-4">
              <span class="h-px w-8 bg-secondary/60"></span>
              <span>Curated Marketplace</span>
            </div>
            <h1 class="font-heading text-5xl sm:text-6xl lg:text-[4.5rem] font-bold tracking-tight text-text-primary leading-[0.92]">
              Explore Assets
            </h1>
            <p class="mt-4 text-[13px] text-text-secondary max-w-md leading-[1.7]">
              Discover premium digital assets vetted for quality — source code, UI kits, 3D models, graphics, and audio ready for production.
            </p>
          </div>

          <!-- Search & Mobile Filter Controls -->
          <div class="flex items-center gap-3 w-full lg:w-auto">
            <!-- Debounced Search Input -->
            <div class="relative w-full lg:w-96 group">
              <input
                :value="searchQuery"
                type="text"
                placeholder="Search by title, description, or tags..."
                class="w-full rounded-xl border border-border/50 bg-elevated/80 py-3 pl-11 pr-10 text-[13px] text-text-primary placeholder-text-muted focus:border-secondary/60 focus:outline-none focus:ring-1 focus:ring-secondary/20 transition-all duration-200"
                @input="onSearchInput"
                @keyup.enter="handleSearchImmediate"
              />
              <Search class="absolute left-4 top-3.5 h-4 w-4 text-text-muted group-focus-within:text-secondary transition" />

              <!-- Clear search button -->
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-3 top-3 h-5 w-5 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-elevated-subtle transition"
                title="Hapus pencarian"
                @click="clearSearch"
              >
                <X class="h-3 w-3" />
              </button>
            </div>

            <!-- Mobile Filter Trigger Button -->
            <button
              type="button"
              class="lg:hidden relative flex items-center gap-2 rounded-xl border border-border/50 bg-elevated px-4 py-3 text-[12px] font-semibold text-text-primary hover:border-border-hover transition shrink-0"
              @click="mobileFilterOpen = true"
            >
              <Filter class="h-4 w-4 text-secondary" />
              <span>Filters</span>
              <span
                v-if="activeFilterCount > 0"
                class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-background"
              >
                {{ activeFilterCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- ═══ Horizontal Category Pills ═══ -->
        <div class="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mb-px">
          <button
            class="shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200"
            :class="
              filters.category === 'all'
                ? 'bg-text-primary text-background shadow-lg'
                : 'text-text-secondary hover:text-text-primary border border-border/40 hover:border-border-hover'
            "
            @click="applyCategory('all')"
          >
            All Categories
          </button>

          <button
            v-for="cat in categories"
            :key="cat.id"
            class="shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200 inline-flex items-center gap-2"
            :class="
              filters.category === cat.slug || filters.category === cat.id
                ? 'bg-text-primary text-background shadow-lg'
                : 'text-text-secondary hover:text-text-primary border border-border/40 hover:border-border-hover'
            "
            @click="applyCategory(cat.slug)"
          >
            <span>{{ cat.name }}</span>
            <span
              v-if="cat.assetCount !== undefined && cat.assetCount > 0"
              class="text-[9px] opacity-60 tabular-nums"
            >
              {{ cat.assetCount }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════
         MAIN LAYOUT: DESKTOP SIDEBAR + RESULTS GRID
         ═══════════════════════════════════════════════ -->
    <div class="mx-auto max-w-[1440px] px-6 lg:px-12 py-10">
      <div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 xl:gap-12 items-start">

        <!-- ═══ DESKTOP FILTER SIDEBAR ═══ -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-5">
            <div class="rounded-2xl border border-border/40 bg-elevated-card p-5 space-y-6">
              <!-- Filter Header -->
              <div class="flex items-center justify-between pb-3 border-b border-border/30">
                <div class="flex items-center gap-2 text-[13px] font-bold text-text-primary">
                  <SlidersHorizontal class="h-4 w-4 text-secondary" />
                  <span>Filters</span>
                  <span
                    v-if="activeFilterCount > 0"
                    class="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary"
                  >
                    {{ activeFilterCount }}
                  </span>
                </div>
                <button
                  v-if="hasActiveFilters"
                  class="text-[11px] text-text-muted hover:text-primary transition flex items-center gap-1 font-medium"
                  @click="resetAllFilters"
                >
                  <RotateCcw class="h-3 w-3" />
                  <span>Reset All</span>
                </button>
              </div>

              <!-- 1. Free vs Paid Filter (Segmented Control) -->
              <div>
                <h4 class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">
                  Pricing Model
                </h4>
                <div class="grid grid-cols-3 gap-1 rounded-xl bg-background p-1 border border-border/40">
                  <button
                    v-for="opt in pricingOptions"
                    :key="opt.id"
                    type="button"
                    class="flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all"
                    :class="
                      filters.pricing === opt.id
                        ? 'bg-elevated-card text-secondary font-semibold shadow-sm border border-border/50'
                        : 'text-text-muted hover:text-text-primary'
                    "
                    @click="applyPricing(opt.id)"
                  >
                    <component :is="opt.icon" class="h-3.5 w-3.5 mb-1 opacity-80" />
                    <span class="truncate">{{ opt.label.replace(' Only', '').replace(' Assets', '') }}</span>
                  </button>
                </div>
              </div>

              <!-- 2. Asset Type Filter -->
              <div>
                <h4 class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">
                  Asset Type
                </h4>
                <div class="space-y-1">
                  <button
                    v-for="t in assetTypes"
                    :key="t.id"
                    type="button"
                    class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[12px] text-left transition-all duration-150"
                    :class="
                      filters.type === t.id
                        ? 'bg-secondary/10 text-secondary font-semibold border border-secondary/20'
                        : 'text-text-secondary hover:bg-elevated-subtle hover:text-text-primary'
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

              <!-- 3. Price Range Filter -->
              <div class="border-t border-border/30 pt-4">
                <div class="flex items-center justify-between mb-2.5">
                  <h4 class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
                    Price Range
                  </h4>
                  <button
                    v-if="filters.minPrice !== undefined || filters.maxPrice !== undefined"
                    class="text-[10px] text-secondary hover:underline"
                    @click="clearPriceFilter"
                  >
                    Clear Price
                  </button>
                </div>

                <!-- Price Presets -->
                <div class="space-y-1 mb-3">
                  <button
                    v-for="preset in pricePresets"
                    :key="preset.label"
                    type="button"
                    class="w-full text-left rounded-lg px-3 py-1.5 text-[12px] transition-all duration-150"
                    :class="
                      filters.minPrice === preset.min && filters.maxPrice === preset.max
                        ? 'text-secondary font-semibold bg-secondary/10 border border-secondary/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-elevated-subtle'
                    "
                    @click="applyPricePreset(preset.min, preset.max)"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <!-- Custom Range Inputs -->
                <div class="space-y-2 pt-2 border-t border-border/20">
                  <div class="text-[11px] text-text-muted">Custom Range (Rp):</div>
                  <div class="grid grid-cols-2 gap-2">
                    <input
                      v-model.number="localMinPrice"
                      type="number"
                      placeholder="Min (Rp)"
                      min="0"
                      step="10000"
                      class="w-full rounded-lg border border-border/40 bg-background py-1.5 px-2.5 text-[11px] text-text-primary placeholder-text-muted focus:border-secondary/50 focus:outline-none transition"
                      @keyup.enter="applyCustomPrice"
                    />
                    <input
                      v-model.number="localMaxPrice"
                      type="number"
                      placeholder="Max (Rp)"
                      min="0"
                      step="10000"
                      class="w-full rounded-lg border border-border/40 bg-background py-1.5 px-2.5 text-[11px] text-text-primary placeholder-text-muted focus:border-secondary/50 focus:outline-none transition"
                      @keyup.enter="applyCustomPrice"
                    />
                  </div>
                  <button
                    type="button"
                    class="w-full rounded-lg bg-elevated-subtle hover:bg-border/60 py-1.5 text-[11px] font-semibold text-text-primary transition"
                    @click="applyCustomPrice"
                  >
                    Apply Price
                  </button>
                </div>
              </div>

              <!-- Quality Trust Indicator -->
              <div class="border-t border-border/30 pt-4">
                <div class="flex items-center gap-2 text-[10px] text-success">
                  <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                  <span class="font-medium tracking-wide">100% Curated & Admin-Verified</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- ═══ RESULTS MAIN COLUMN ═══ -->
        <section>
          <!-- Results Top Bar: Count & Sorting -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div class="text-[13px] text-text-secondary">
              <span v-if="!isLoading && !isError">
                Showing
                <strong class="text-text-primary font-bold tabular-nums">{{ assets.length }}</strong>
                of
                <strong class="text-text-primary font-bold tabular-nums">{{ pagination.total }}</strong>
                assets
                <span v-if="filters.q.trim()" class="text-text-muted">
                  for "<strong class="text-secondary font-medium">{{ filters.q }}</strong>"
                </span>
              </span>
              <span v-else-if="isLoading" class="text-text-muted inline-flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-secondary animate-ping"></span>
                <span>Searching catalog...</span>
              </span>
            </div>

            <!-- Sort Dropdown -->
            <div class="flex items-center gap-2.5 text-[12px]">
              <span class="text-text-muted shrink-0 flex items-center gap-1">
                <ArrowUpDown class="h-3.5 w-3.5 opacity-60" />
                <span>Sort by:</span>
              </span>
              <div class="relative">
                <select
                  :value="filters.sort"
                  class="rounded-xl border border-border/50 bg-elevated-card py-2 pl-3 pr-8 text-[12px] font-medium text-text-primary focus:border-secondary/60 focus:outline-none focus:ring-1 focus:ring-secondary/20 transition cursor-pointer appearance-none"
                  @change="handleSortChange"
                >
                  <option v-for="opt in sortOptions" :key="opt.id" :value="opt.id">
                    {{ opt.label }}
                  </option>
                </select>
                <ChevronRight class="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-text-muted rotate-90" />
              </div>
            </div>
          </div>

          <!-- Active Filter Tags / Chips Bar -->
          <div
            v-if="hasActiveFilters"
            class="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-xl bg-elevated/40 border border-border/30"
          >
            <span class="text-[11px] font-bold uppercase tracking-wider text-text-muted mr-1">
              Active Filters:
            </span>

            <!-- Keyword Chip -->
            <span
              v-if="filters.q.trim()"
              class="inline-flex items-center gap-1.5 rounded-lg bg-elevated-card border border-border/60 px-2.5 py-1 text-[11px] text-text-primary"
            >
              <Search class="h-3 w-3 text-secondary" />
              <span>Keyword: "{{ filters.q }}"</span>
              <button
                type="button"
                class="hover:text-primary transition"
                title="Hapus kata kunci"
                @click="clearSearch"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

            <!-- Category Chip -->
            <span
              v-if="filters.category !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-elevated-card border border-border/60 px-2.5 py-1 text-[11px] text-text-primary"
            >
              <Tag class="h-3 w-3 text-secondary" />
              <span>Category: {{ currentCategoryName }}</span>
              <button
                type="button"
                class="hover:text-primary transition"
                title="Hapus filter kategori"
                @click="applyCategory('all')"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

            <!-- Type Chip -->
            <span
              v-if="filters.type !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-elevated-card border border-border/60 px-2.5 py-1 text-[11px] text-text-primary"
            >
              <Sparkles class="h-3 w-3 text-secondary" />
              <span>Type: {{ currentTypeName }}</span>
              <button
                type="button"
                class="hover:text-primary transition"
                title="Hapus filter tipe"
                @click="applyType('all')"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

            <!-- Pricing Model Chip -->
            <span
              v-if="filters.pricing !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-lg bg-elevated-card border border-border/60 px-2.5 py-1 text-[11px] text-text-primary"
            >
              <Coins v-if="filters.pricing === 'paid'" class="h-3 w-3 text-secondary" />
              <Gift v-else class="h-3 w-3 text-secondary" />
              <span>Pricing: {{ filters.pricing === 'free' ? 'Free Only' : 'Paid Only' }}</span>
              <button
                type="button"
                class="hover:text-primary transition"
                title="Hapus filter harga"
                @click="applyPricing('all')"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

            <!-- Price Range Chip -->
            <span
              v-if="filters.minPrice !== undefined || filters.maxPrice !== undefined"
              class="inline-flex items-center gap-1.5 rounded-lg bg-elevated-card border border-border/60 px-2.5 py-1 text-[11px] text-text-primary"
            >
              <span>
                Price:
                {{ filters.minPrice !== undefined ? formatPriceShort(filters.minPrice) : 'Rp 0' }}
                –
                {{ filters.maxPrice !== undefined ? formatPriceShort(filters.maxPrice) : 'Any' }}
              </span>
              <button
                type="button"
                class="hover:text-primary transition"
                title="Hapus rentang harga"
                @click="clearPriceFilter"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

            <!-- Reset All Action Button -->
            <button
              type="button"
              class="inline-flex items-center gap-1 text-[11px] text-secondary hover:text-secondary-hover font-semibold ml-auto transition px-2 py-1 rounded hover:bg-secondary/10"
              @click="resetAllFilters"
            >
              <RotateCcw class="h-3 w-3" />
              <span>Reset All</span>
            </button>
          </div>

          <!-- ═══ LOADING: Skeleton Grid ═══ -->
          <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-7">
            <AssetCardSkeleton v-for="n in 9" :key="n" />
          </div>

          <!-- ═══ ERROR STATE ═══ -->
          <div
            v-else-if="isError"
            class="rounded-2xl border border-primary/20 bg-primary/5 p-16 text-center"
          >
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
              <AlertCircle class="h-8 w-8 text-primary" />
            </div>
            <h3 class="font-heading text-2xl font-bold text-text-primary mb-2">
              Failed to Load Catalog
            </h3>
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

          <!-- ═══ EMPTY STATE ═══ -->
          <EmptyState
            v-else-if="assets.length === 0"
            icon="search"
            icon-color="secondary"
            title="Tidak Ada Aset yang Ditemukan"
            description="Tidak ada aset digital yang cocok dengan kata kunci atau kombinasi filter saat ini. Coba atur ulang parameter atau eksplorasi kategori kurasi lainnya."
            action-text="Reset Semua Filter"
            :action-icon="RotateCcw"
            action-variant="secondary"
            @action="resetAllFilters"
          />

          <!-- ═══ RESULTS GRID ═══ -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 xl:gap-7">
            <div
              v-for="(item, index) in assets"
              :key="item.id"
              class="animate-fade-in-up"
              :style="{ animationDelay: `${index * 40}ms` }"
            >
              <AssetCard :asset="item" />
            </div>
          </div>

          <!-- ═══ PAGINATION ═══ -->
          <div
            v-if="pagination.totalPages > 1 && !isLoading"
            class="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/30 pt-8"
          >
            <div class="text-[12px] text-text-muted">
              Page <span class="font-bold text-text-primary tabular-nums">{{ pagination.page }}</span> of
              <span class="font-bold text-text-primary tabular-nums">{{ pagination.totalPages }}</span>
              (<span class="tabular-nums">{{ pagination.total }}</span> total assets)
            </div>

            <div class="flex items-center gap-1">
              <!-- First page -->
              <button
                v-if="pagination.totalPages > 5 && pagination.page > 3"
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg text-[12px] text-text-muted hover:text-text-primary hover:bg-elevated-subtle transition"
                title="First Page"
                @click="goToPage(1)"
              >
                <ChevronsLeft class="h-4 w-4" />
              </button>

              <!-- Prev -->
              <button
                type="button"
                :disabled="pagination.page <= 1"
                class="flex h-9 items-center gap-1 rounded-lg border border-border/40 bg-elevated-card px-3 text-[12px] font-medium text-text-primary hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none transition"
                @click="goToPage(pagination.page - 1)"
              >
                <ChevronLeft class="h-4 w-4" />
                <span class="hidden sm:inline">Prev</span>
              </button>

              <!-- Page Numbers -->
              <div class="flex items-center gap-1">
                <button
                  v-for="p in visiblePages()"
                  :key="p"
                  type="button"
                  class="h-9 w-9 rounded-lg text-[12px] font-medium transition-all duration-200"
                  :class="
                    pagination.page === p
                      ? 'bg-text-primary text-background font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-elevated-subtle'
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
                class="flex h-9 items-center gap-1 rounded-lg border border-border/40 bg-elevated-card px-3 text-[12px] font-medium text-text-primary hover:border-border-hover disabled:opacity-30 disabled:pointer-events-none transition"
                @click="goToPage(pagination.page + 1)"
              >
                <span class="hidden sm:inline">Next</span>
                <ChevronRight class="h-4 w-4" />
              </button>

              <!-- Last page -->
              <button
                v-if="pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2"
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-lg text-[12px] text-text-muted hover:text-text-primary hover:bg-elevated-subtle transition"
                title="Last Page"
                @click="goToPage(pagination.totalPages)"
              >
                <ChevronsRight class="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════
         MOBILE FILTER SLIDE-OVER DRAWER MODAL
         ═══════════════════════════════════════════════ -->
    <div
      v-if="mobileFilterOpen"
      class="fixed inset-0 z-50 lg:hidden flex justify-end animate-fade-in"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        @click="mobileFilterOpen = false"
      ></div>

      <!-- Slide-over Drawer Panel -->
      <div
        class="relative w-full max-w-sm bg-elevated-card border-l border-border/50 h-full flex flex-col shadow-2xl z-10 overflow-hidden"
      >
        <!-- Drawer Header -->
        <div class="flex items-center justify-between p-5 border-b border-border/40 shrink-0">
          <div class="flex items-center gap-2 font-heading text-lg font-bold text-text-primary">
            <SlidersHorizontal class="h-5 w-5 text-secondary" />
            <span>Filter Catalog</span>
            <span
              v-if="activeFilterCount > 0"
              class="rounded-full bg-secondary text-background text-[10px] font-bold px-2 py-0.5"
            >
              {{ activeFilterCount }}
            </span>
          </div>
          <button
            type="button"
            class="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-elevated-subtle transition"
            @click="mobileFilterOpen = false"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Drawer Body (Scrollable) -->
        <div class="p-5 space-y-6 overflow-y-auto flex-1">
          <!-- Pricing Model -->
          <div>
            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
              Pricing Model
            </h4>
            <div class="grid grid-cols-3 gap-1 rounded-xl bg-background p-1 border border-border/40">
              <button
                v-for="opt in pricingOptions"
                :key="opt.id"
                type="button"
                class="flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all"
                :class="
                  filters.pricing === opt.id
                    ? 'bg-elevated text-secondary font-semibold border border-border/50'
                    : 'text-text-muted hover:text-text-primary'
                "
                @click="applyPricing(opt.id)"
              >
                <component :is="opt.icon" class="h-3.5 w-3.5 mb-1 opacity-80" />
                <span>{{ opt.label.replace(' Only', '').replace(' Assets', '') }}</span>
              </button>
            </div>
          </div>

          <!-- Category Selection -->
          <div>
            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
              Category
            </h4>
            <div class="space-y-1 max-h-44 overflow-y-auto pr-1">
              <button
                type="button"
                class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[12px] text-left transition"
                :class="
                  filters.category === 'all'
                    ? 'bg-secondary/10 text-secondary font-semibold border border-secondary/20'
                    : 'text-text-secondary hover:bg-elevated-subtle'
                "
                @click="applyCategory('all')"
              >
                <span>All Categories</span>
                <Check v-if="filters.category === 'all'" class="h-3.5 w-3.5 text-secondary" />
              </button>

              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[12px] text-left transition"
                :class="
                  filters.category === cat.slug || filters.category === cat.id
                    ? 'bg-secondary/10 text-secondary font-semibold border border-secondary/20'
                    : 'text-text-secondary hover:bg-elevated-subtle'
                "
                @click="applyCategory(cat.slug)"
              >
                <span>{{ cat.name }}</span>
                <Check
                  v-if="filters.category === cat.slug || filters.category === cat.id"
                  class="h-3.5 w-3.5 text-secondary"
                />
              </button>
            </div>
          </div>

          <!-- Asset Type -->
          <div>
            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
              Asset Type
            </h4>
            <div class="space-y-1">
              <button
                v-for="t in assetTypes"
                :key="t.id"
                type="button"
                class="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[12px] text-left transition"
                :class="
                  filters.type === t.id
                    ? 'bg-secondary/10 text-secondary font-semibold border border-secondary/20'
                    : 'text-text-secondary hover:bg-elevated-subtle'
                "
                @click="applyType(t.id)"
              >
                <div class="flex items-center gap-2">
                  <component :is="t.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>{{ t.label }}</span>
                </div>
                <Check v-if="filters.type === t.id" class="h-3.5 w-3.5 text-secondary" />
              </button>
            </div>
          </div>

          <!-- Price Range -->
          <div class="border-t border-border/30 pt-4">
            <h4 class="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-3">
              Price Range
            </h4>
            <div class="space-y-1 mb-3">
              <button
                v-for="preset in pricePresets"
                :key="preset.label"
                type="button"
                class="w-full text-left rounded-lg px-3 py-1.5 text-[12px] transition"
                :class="
                  filters.minPrice === preset.min && filters.maxPrice === preset.max
                    ? 'text-secondary font-semibold bg-secondary/10 border border-secondary/20'
                    : 'text-text-secondary hover:bg-elevated-subtle'
                "
                @click="applyPricePreset(preset.min, preset.max)"
              >
                {{ preset.label }}
              </button>
            </div>

            <!-- Custom Min/Max Inputs -->
            <div class="space-y-2 pt-2 border-t border-border/20">
              <div class="grid grid-cols-2 gap-2">
                <input
                  v-model.number="localMinPrice"
                  type="number"
                  placeholder="Min (Rp)"
                  min="0"
                  class="w-full rounded-lg border border-border/40 bg-background py-2 px-2.5 text-[11px] text-text-primary placeholder-text-muted focus:border-secondary/50 focus:outline-none transition"
                />
                <input
                  v-model.number="localMaxPrice"
                  type="number"
                  placeholder="Max (Rp)"
                  min="0"
                  class="w-full rounded-lg border border-border/40 bg-background py-2 px-2.5 text-[11px] text-text-primary placeholder-text-muted focus:border-secondary/50 focus:outline-none transition"
                />
              </div>
              <button
                type="button"
                class="w-full rounded-lg bg-elevated-subtle py-2 text-[11px] font-semibold text-text-primary transition"
                @click="applyCustomPrice"
              >
                Apply Custom Price
              </button>
            </div>
          </div>
        </div>

        <!-- Drawer Footer (Sticky Actions) -->
        <div class="p-4 border-t border-border/40 bg-elevated/60 shrink-0 flex items-center gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border border-border/50 py-2.5 text-[12px] font-semibold text-text-muted hover:text-text-primary transition"
            @click="resetAllFilters"
          >
            Reset All
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
