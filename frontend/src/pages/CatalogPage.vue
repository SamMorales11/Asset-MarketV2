<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { assetService } from '../services/assets';
import AssetCard from '../components/AssetCard.vue';
import AssetCardSkeleton from '../components/AssetCardSkeleton.vue';
import type { Asset, Category, Pagination } from '../types';
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  RotateCcw,
  Sparkles,
  Layout,
  Code2,
  Box,
  Palette,
  Music2,
  X,
  AlertCircle,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// State
const assets = ref<Asset[]>([]);
const categories = ref<Category[]>([]);
const pagination = ref<Pagination>({
  total: 0,
  page: 1,
  limit: 9,
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
  { id: 'all', label: 'All Asset Types', icon: Sparkles },
  { id: 'ui_template', label: 'UI & Web Templates', icon: Layout },
  { id: 'source_code', label: 'Source Code & Starters', icon: Code2 },
  { id: '3d_model', label: '3D Models & Rigs', icon: Box },
  { id: 'graphic', label: 'Graphics & Vectors', icon: Palette },
  { id: 'audio', label: 'Audio & SFX', icon: Music2 },
];

const sortOptions = [
  { id: 'newest', label: 'Newest Arrivals' },
  { id: 'popular', label: 'Most Downloaded' },
  { id: 'rating', label: 'Highest Rated' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
];

const pricePresets = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under Rp 200.000', min: undefined, max: 200000 },
  { label: 'Rp 200k – Rp 500k', min: 200000, max: 500000 },
  { label: 'Above Rp 500.000', min: 500000, max: undefined },
];

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
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Top Horizontal Bar of F-Pattern: Header & Search & Quick Category Strip -->
    <div class="border-b border-border pb-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <Sparkles class="h-3.5 w-3.5" />
            <span>Digital Assets Marketplace</span>
          </div>
          <h1 class="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
            Browse Curated Assets
          </h1>
          <p class="mt-2 text-xs sm:text-sm text-text-secondary max-w-xl">
            Vetted source code, UI kits, 3D models, and graphic assets ready for commercial use.
          </p>
        </div>

        <!-- Search Bar with Instant Submit -->
        <div class="flex items-center gap-3 w-full md:w-auto">
          <div class="relative w-full md:w-80">
            <input
              v-model="filters.q"
              type="text"
              placeholder="Search by keywords, tags..."
              class="w-full rounded-2xl border border-border bg-elevated/90 py-2.5 pl-10 pr-4 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition"
              @keyup.enter="handleSearch"
            />
            <Search class="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
          </div>

          <!-- Mobile Filter Drawer Toggle -->
          <button
            class="lg:hidden flex items-center gap-2 rounded-2xl border border-border bg-elevated px-4 py-2.5 text-xs font-semibold text-text-primary hover:border-border-hover transition"
            @click="mobileFilterOpen = !mobileFilterOpen"
          >
            <Filter class="h-4 w-4 text-primary" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <!-- Horizontal Visual Categories Scroll (Top stroke of F) -->
      <div class="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          class="shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition"
          :class="
            filters.category === 'all'
              ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/20'
              : 'bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-hover'
          "
          @click="applyCategory('all')"
        >
          All Categories
        </button>

        <button
          v-for="cat in categories"
          :key="cat.id"
          class="shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition flex items-center gap-2"
          :class="
            filters.category === cat.slug
              ? 'bg-primary text-white font-semibold shadow-lg shadow-primary/20'
              : 'bg-elevated border border-border text-text-secondary hover:text-text-primary hover:border-border-hover'
          "
          @click="applyCategory(cat.slug)"
        >
          <span>{{ cat.name }}</span>
          <span
            v-if="cat.assetCount !== undefined && cat.assetCount > 0"
            class="rounded-full bg-background/50 px-1.5 py-0.2 text-[10px] opacity-80"
          >
            {{ cat.assetCount }}
          </span>
        </button>
      </div>
    </div>

    <!-- Main Layout (F-Pattern Body: Left Stem Filter + Main Grid) -->
    <div class="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      <!-- LEFT STEM: Filter Sidebar (Desktop) -->
      <aside
        class="lg:col-span-1 space-y-6"
        :class="mobileFilterOpen ? 'block' : 'hidden lg:block'"
      >
        <div class="rounded-3xl border border-border bg-elevated/80 p-6 backdrop-blur-sm space-y-6">
          <!-- Filter Header -->
          <div class="flex items-center justify-between border-b border-border pb-3">
            <div class="flex items-center gap-2 font-heading text-lg font-bold text-text-primary">
              <SlidersHorizontal class="h-4 w-4 text-secondary" />
              <span>Filters</span>
            </div>
            <button
              class="text-[11px] text-text-secondary hover:text-primary transition flex items-center gap-1"
              @click="resetAllFilters"
            >
              <RotateCcw class="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>

          <!-- Filter Group: Asset Types -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              Asset Type
            </h4>
            <div class="space-y-1.5">
              <button
                v-for="t in assetTypes"
                :key="t.id"
                class="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition"
                :class="
                  filters.type === t.id
                    ? 'bg-secondary/15 text-secondary font-semibold border border-secondary/30'
                    : 'text-text-secondary hover:bg-elevated-subtle hover:text-text-primary'
                "
                @click="applyType(t.id)"
              >
                <div class="flex items-center gap-2">
                  <component :is="t.icon" class="h-3.5 w-3.5 shrink-0" />
                  <span>{{ t.label }}</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Filter Group: Price Budget Range -->
          <div class="border-t border-border pt-5">
            <h4 class="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
              Price Range (IDR)
            </h4>
            <div class="space-y-2 mb-3">
              <button
                v-for="preset in pricePresets"
                :key="preset.label"
                class="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-elevated-subtle transition"
                :class="
                  filters.minPrice === preset.min && filters.maxPrice === preset.max
                    ? 'text-primary font-semibold'
                    : ''
                "
                @click="applyPricePreset(preset.min, preset.max)"
              >
                {{ preset.label }}
              </button>
            </div>

            <!-- Custom Min - Max Inputs -->
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model.number="filters.minPrice"
                type="number"
                placeholder="Min"
                class="w-full rounded-xl border border-border bg-background py-1.5 px-3 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none"
                @change="updateQueryParams"
              />
              <input
                v-model.number="filters.maxPrice"
                type="number"
                placeholder="Max"
                class="w-full rounded-xl border border-border bg-background py-1.5 px-3 text-xs text-text-primary placeholder-text-secondary focus:border-primary focus:outline-none"
                @change="updateQueryParams"
              />
            </div>
          </div>

          <!-- Filter Summary Banner -->
          <div class="border-t border-border pt-4 text-xs text-text-secondary">
            <div class="flex items-center gap-1.5 text-success">
              <span class="h-2 w-2 rounded-full bg-success"></span>
              <span class="font-medium text-[11px]">100% Moderated & Safe</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- RIGHT BODY: Results Header, Asset Grid, and Pagination -->
      <section class="lg:col-span-3">
        <!-- Results Top Bar: Count & Sorting -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-elevated/40 p-4 mb-6 backdrop-blur-sm">
          <div class="text-xs text-text-secondary">
            Showing
            <strong class="text-text-primary font-semibold font-mono">{{ assets.length }}</strong>
            of
            <strong class="text-text-primary font-semibold font-mono">{{ pagination.total }}</strong>
            verified assets
          </div>

          <!-- Sorting Dropdown -->
          <div class="flex items-center gap-2 text-xs">
            <span class="text-text-secondary shrink-0">Sort By:</span>
            <select
              :value="filters.sort"
              class="rounded-xl border border-border bg-background py-1.5 px-3 text-xs font-medium text-text-primary focus:border-primary focus:outline-none transition cursor-pointer"
              @change="handleSortChange"
            >
              <option v-for="opt in sortOptions" :key="opt.id" :value="opt.id">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Active Filter Chips -->
        <div
          v-if="filters.category !== 'all' || filters.type !== 'all' || filters.q || filters.minPrice || filters.maxPrice"
          class="flex flex-wrap items-center gap-2 mb-6"
        >
          <span class="text-xs text-text-secondary">Active Filters:</span>

          <span
            v-if="filters.category !== 'all'"
            class="inline-flex items-center gap-1 rounded-lg bg-elevated border border-border px-2.5 py-1 text-xs text-text-primary"
          >
            <span>Category: {{ filters.category }}</span>
            <button class="hover:text-primary" @click="applyCategory('all')">
              <X class="h-3 w-3" />
            </button>
          </span>

          <span
            v-if="filters.type !== 'all'"
            class="inline-flex items-center gap-1 rounded-lg bg-elevated border border-border px-2.5 py-1 text-xs text-text-primary"
          >
            <span>Type: {{ filters.type.replace('_', ' ') }}</span>
            <button class="hover:text-primary" @click="applyType('all')">
              <X class="h-3 w-3" />
            </button>
          </span>

          <span
            v-if="filters.q"
            class="inline-flex items-center gap-1 rounded-lg bg-elevated border border-border px-2.5 py-1 text-xs text-text-primary"
          >
            <span>Search: "{{ filters.q }}"</span>
            <button class="hover:text-primary" @click="filters.q = ''; updateQueryParams()">
              <X class="h-3 w-3" />
            </button>
          </span>

          <button
            class="text-xs text-secondary hover:underline font-medium ml-1"
            @click="resetAllFilters"
          >
            Clear All
          </button>
        </div>

        <!-- LOADING STATE (Skeleton Grid) -->
        <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <AssetCardSkeleton v-for="n in 6" :key="n" />
        </div>

        <!-- ERROR STATE -->
        <div
          v-else-if="isError"
          class="rounded-3xl border border-primary/30 bg-primary/10 p-12 text-center text-xs text-primary"
        >
          <AlertCircle class="mx-auto h-12 w-12 mb-3" />
          <h3 class="font-heading text-2xl font-bold text-text-primary mb-1">
            Failed to Load Catalog
          </h3>
          <p class="max-w-md mx-auto text-text-secondary leading-relaxed mb-4">
            {{ errorMessage }}
          </p>
          <button
            class="rounded-xl bg-primary px-5 py-2 text-white font-semibold shadow hover:bg-primary-hover transition"
            @click="fetchAssets"
          >
            Try Again
          </button>
        </div>

        <!-- EMPTY STATE -->
        <div
          v-else-if="assets.length === 0"
          class="rounded-3xl border border-dashed border-border bg-elevated/40 p-16 text-center"
        >
          <FolderOpen class="mx-auto h-16 w-16 text-text-secondary/50 mb-4" />
          <h3 class="font-heading text-3xl font-bold text-text-primary">
            No Matching Assets Found
          </h3>
          <p class="mt-2 text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
            We couldn't find any approved assets matching your current search and filter criteria.
          </p>
          <button
            class="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-primary-hover transition"
            @click="resetAllFilters"
          >
            <RotateCcw class="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>

        <!-- RESULTS GRID (Second Stroke of F-Pattern) -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <AssetCard
            v-for="item in assets"
            :key="item.id"
            :asset="item"
          />
        </div>

        <!-- PAGINATION CONTROLS -->
        <div
          v-if="pagination.totalPages > 1 && !isLoading"
          class="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6"
        >
          <div class="text-xs text-text-secondary">
            Page <span class="font-bold text-text-primary">{{ pagination.page }}</span> of
            <span class="font-bold text-text-primary">{{ pagination.totalPages }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              :disabled="pagination.page <= 1"
              class="flex h-9 items-center gap-1 rounded-xl border border-border bg-elevated px-3 text-xs font-medium text-text-primary hover:border-border-hover disabled:opacity-40 disabled:pointer-events-none transition"
              @click="goToPage(pagination.page - 1)"
            >
              <ChevronLeft class="h-4 w-4" />
              <span>Prev</span>
            </button>

            <!-- Page Number Buttons -->
            <div class="flex items-center gap-1">
              <button
                v-for="p in pagination.totalPages"
                :key="p"
                class="h-9 w-9 rounded-xl text-xs font-medium transition"
                :class="
                  pagination.page === p
                    ? 'bg-primary text-white font-bold shadow'
                    : 'bg-elevated border border-border text-text-secondary hover:text-text-primary'
                "
                @click="goToPage(p)"
              >
                {{ p }}
              </button>
            </div>

            <button
              :disabled="pagination.page >= pagination.totalPages"
              class="flex h-9 items-center gap-1 rounded-xl border border-border bg-elevated px-3 text-xs font-medium text-text-primary hover:border-border-hover disabled:opacity-40 disabled:pointer-events-none transition"
              @click="goToPage(pagination.page + 1)"
            >
              <span>Next</span>
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
