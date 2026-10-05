<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
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

// Filter Form State (synced with URL)
const filters = reactive({
  category: (route.query.category as string) || 'all',
  type: (route.query.type as string) || 'all',
  q: (route.query.q as string) || '',
  minPrice: route.query.minPrice ? Number(route.query.minPrice) : undefined as number | undefined,
  maxPrice: route.query.maxPrice ? Number(route.query.maxPrice) : undefined as number | undefined,
  sort: (route.query.sort as string) || 'newest',
  page: route.query.page ? Number(route.query.page) : 1,
});

const assetTypes: { id: string; label: string; icon: any }[] = [
  { id: 'all', label: 'All Types', icon: Sparkles },
  { id: 'ui_template', label: 'UI Templates', icon: Layout },
  { id: 'source_code', label: 'Source Code', icon: Code2 },
  { id: '3d_model', label: '3D Models', icon: Box },
  { id: 'graphic', label: 'Graphics', icon: Palette },
  { id: 'audio', label: 'Audio & SFX', icon: Music2 },
];

const sortOptions = [
  { id: 'newest', label: 'Newest' },
  { id: 'popular', label: 'Most Downloaded' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'price_asc', label: 'Price: Low → High' },
  { id: 'price_desc', label: 'Price: High → Low' },
];

const pricePresets = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under Rp 200k', min: undefined, max: 200000 },
  { label: 'Rp 200k – 500k', min: 200000, max: 500000 },
  { label: 'Above Rp 500k', min: 500000, max: undefined },
];

const hasActiveFilters = () => {
  return filters.category !== 'all' || filters.type !== 'all' || filters.q.trim() !== '' || filters.minPrice !== undefined || filters.maxPrice !== undefined;
};

onMounted(async () => {
  await Promise.all([loadCategories(), fetchAssets()]);
});

// Watch route query changes for back/forward navigation
watch(
  () => route.query,
  () => {
    filters.category = (route.query.category as string) || 'all';
    filters.type = (route.query.type as string) || 'all';
    filters.q = (route.query.q as string) || '';
    filters.minPrice = route.query.minPrice ? Number(route.query.minPrice) : undefined;
    filters.maxPrice = route.query.maxPrice ? Number(route.query.maxPrice) : undefined;
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
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.minPrice !== undefined) query.minPrice = filters.minPrice;
  if (filters.maxPrice !== undefined) query.maxPrice = filters.maxPrice;
  if (filters.sort !== 'newest') query.sort = filters.sort;
  if (filters.page > 1) query.page = filters.page;

  router.push({ query });
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

function applyPricePreset(min?: number, max?: number) {
  filters.minPrice = min;
  filters.maxPrice = max;
  filters.page = 1;
  updateQueryParams();
}

function handleSearch() {
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
  filters.category = 'all';
  filters.type = 'all';
  filters.q = '';
  filters.minPrice = undefined;
  filters.maxPrice = undefined;
  filters.sort = 'newest';
  filters.page = 1;
  updateQueryParams();
}

/**
 * Smart pagination: show at most 5 page numbers, centered around current page.
 */
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
        <!-- Eyebrow + Headline -->
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
              Discover premium digital assets vetted for quality — source code, UI kits, 3D models, and graphics ready for your next project.
            </p>
          </div>

          <!-- Search Bar -->
          <div class="flex items-center gap-3 w-full lg:w-auto">
            <div class="relative w-full lg:w-80">
              <input
                v-model="filters.q"
                type="text"
                placeholder="Search assets..."
                class="w-full rounded-xl border border-border/50 bg-elevated/80 py-3 pl-11 pr-4 text-[13px] text-text-primary placeholder-text-muted focus:border-secondary/60 focus:outline-none focus:ring-1 focus:ring-secondary/20 transition-all duration-200"
                @keyup.enter="handleSearch"
              />
              <Search class="absolute left-4 top-3.5 h-4 w-4 text-text-muted" />
            </div>

            <!-- Mobile Filter Toggle -->
            <button
              class="lg:hidden flex items-center gap-2 rounded-xl border border-border/50 bg-elevated px-4 py-3 text-[12px] font-semibold text-text-primary hover:border-border-hover transition"
              @click="mobileFilterOpen = !mobileFilterOpen"
            >
              <Filter class="h-4 w-4 text-secondary" />
              <span>Filters</span>
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
            All
          </button>

          <button
            v-for="cat in categories"
            :key="cat.id"
            class="shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200 inline-flex items-center gap-2"
            :class="
              filters.category === cat.slug
                ? 'bg-text-primary text-background shadow-lg'
                : 'text-text-secondary hover:text-text-primary border border-border/40 hover:border-border-hover'
            "
            @click="applyCategory(cat.slug)"
          >
            <span>{{ cat.name }}</span>
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

    <!-- ═══════════════════════════════════════════════
         MAIN LAYOUT: SIDEBAR + GRID
         ═══════════════════════════════════════════════ -->
    <div class="mx-auto max-w-[1440px] px-6 lg:px-12 py-10">
      <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 xl:gap-12 items-start">

        <!-- ═══ LEFT: FILTER SIDEBAR ═══ -->
        <aside
          :class="mobileFilterOpen ? 'block' : 'hidden lg:block'"
        >
          <div class="lg:sticky lg:top-24 space-y-5">
            <div class="rounded-2xl border border-border/40 bg-elevated-card p-5 space-y-5">
              <!-- Filter Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-[13px] font-bold text-text-primary">
                  <SlidersHorizontal class="h-4 w-4 text-secondary" />
                  <span>Refine</span>
                </div>
                <button
                  v-if="hasActiveFilters()"
                  class="text-[10px] text-text-muted hover:text-primary transition flex items-center gap-1"
                  @click="resetAllFilters"
                >
                  <RotateCcw class="h-3 w-3" />
                  <span>Reset</span>
                </button>
              </div>

              <!-- Asset Type Filter -->
              <div>
                <h4 class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">
                  Asset Type
                </h4>
                <div class="space-y-0.5">
                  <button
                    v-for="t in assetTypes"
                    :key="t.id"
                    class="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-left transition-all duration-150"
                    :class="
                      filters.type === t.id
                        ? 'bg-secondary/10 text-secondary font-semibold'
                        : 'text-text-secondary hover:bg-elevated-subtle hover:text-text-primary'
                    "
                    @click="applyType(t.id)"
                  >
                    <component :is="t.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span>{{ t.label }}</span>
                  </button>
                </div>
              </div>

              <!-- Price Filter -->
              <div class="border-t border-border/30 pt-4">
                <h4 class="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2.5">
                  Price Range
                </h4>
                <div class="space-y-0.5">
                  <button
                    v-for="preset in pricePresets"
                    :key="preset.label"
                    class="w-full text-left rounded-lg px-3 py-2 text-[12px] transition-all duration-150"
                    :class="
                      filters.minPrice === preset.min && filters.maxPrice === preset.max
                        ? 'text-secondary font-semibold bg-secondary/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-elevated-subtle'
                    "
                    @click="applyPricePreset(preset.min, preset.max)"
                  >
                    {{ preset.label }}
                  </button>
                </div>

                <!-- Custom Range -->
                <div class="grid grid-cols-2 gap-2 mt-3">
                  <input
                    v-model.number="filters.minPrice"
                    type="number"
                    placeholder="Min"
                    class="w-full rounded-lg border border-border/40 bg-background py-2 px-3 text-[11px] text-text-primary placeholder-text-muted focus:border-secondary/50 focus:outline-none transition"
                    @change="updateQueryParams"
                  />
                  <input
                    v-model.number="filters.maxPrice"
                    type="number"
                    placeholder="Max"
                    class="w-full rounded-lg border border-border/40 bg-background py-2 px-3 text-[11px] text-text-primary placeholder-text-muted focus:border-secondary/50 focus:outline-none transition"
                    @change="updateQueryParams"
                  />
                </div>
              </div>

              <!-- Trust Badge -->
              <div class="border-t border-border/30 pt-4">
                <div class="flex items-center gap-2 text-[10px] text-success">
                  <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                  <span class="font-medium tracking-wide">100% Curated & Verified</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <!-- ═══ RIGHT: RESULTS AREA ═══ -->
        <section>
          <!-- Results Top Bar -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div class="text-[12px] text-text-muted">
              <span v-if="!isLoading && !isError">
                Showing
                <strong class="text-text-primary font-semibold tabular-nums">{{ assets.length }}</strong>
                of
                <strong class="text-text-primary font-semibold tabular-nums">{{ pagination.total }}</strong>
                assets
              </span>
            </div>

            <!-- Sort -->
            <div class="flex items-center gap-2 text-[12px]">
              <span class="text-text-muted">Sort:</span>
              <select
                :value="filters.sort"
                class="rounded-lg border border-border/40 bg-elevated-card py-2 px-3 text-[12px] font-medium text-text-primary focus:border-secondary/50 focus:outline-none transition cursor-pointer appearance-none pr-8"
                @change="handleSortChange"
              >
                <option v-for="opt in sortOptions" :key="opt.id" :value="opt.id">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Active Filter Tags -->
          <div
            v-if="hasActiveFilters()"
            class="flex flex-wrap items-center gap-2 mb-6"
          >
            <span
              v-if="filters.category !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated-card border border-border/40 px-3 py-1.5 text-[11px] text-text-primary"
            >
              <span>{{ filters.category }}</span>
              <button class="hover:text-primary transition" @click="applyCategory('all')">
                <X class="h-3 w-3" />
              </button>
            </span>

            <span
              v-if="filters.type !== 'all'"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated-card border border-border/40 px-3 py-1.5 text-[11px] text-text-primary"
            >
              <span>{{ filters.type.replace('_', ' ') }}</span>
              <button class="hover:text-primary transition" @click="applyType('all')">
                <X class="h-3 w-3" />
              </button>
            </span>

            <span
              v-if="filters.q"
              class="inline-flex items-center gap-1.5 rounded-full bg-elevated-card border border-border/40 px-3 py-1.5 text-[11px] text-text-primary"
            >
              <span>"{{ filters.q }}"</span>
              <button class="hover:text-primary transition" @click="filters.q = ''; updateQueryParams()">
                <X class="h-3 w-3" />
              </button>
            </span>

            <button
              class="text-[11px] text-secondary hover:text-secondary-hover font-medium ml-1 transition"
              @click="resetAllFilters"
            >
              Clear All
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
            description="Tidak ada aset digital yang cocok dengan filter atau kata kunci pencarian Anda. Coba atur ulang parameter atau eksplorasi kategori kurasi lainnya."
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
              :style="{ animationDelay: `${index * 50}ms` }"
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
            </div>

            <div class="flex items-center gap-1">
              <!-- First page -->
              <button
                v-if="pagination.totalPages > 5 && pagination.page > 3"
                class="flex h-9 w-9 items-center justify-center rounded-lg text-[12px] text-text-muted hover:text-text-primary hover:bg-elevated-subtle transition"
                @click="goToPage(1)"
              >
                <ChevronsLeft class="h-4 w-4" />
              </button>

              <!-- Prev -->
              <button
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
                class="flex h-9 w-9 items-center justify-center rounded-lg text-[12px] text-text-muted hover:text-text-primary hover:bg-elevated-subtle transition"
                @click="goToPage(pagination.totalPages)"
              >
                <ChevronsRight class="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
