<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { assetService } from '../services/assets';
import AssetCard from '../components/AssetCard.vue';
import AssetCardSkeleton from '../components/AssetCardSkeleton.vue';
import type { Asset } from '../types';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  BookOpen,
  CheckCircle2,
  Code2,
  Layout,
  Box,
  Palette,
  Music2,
  Lock,
  FileCheck,
  Star,
  Coins,
  ShieldAlert,
  Zap,
  TrendingUp,
  Users,
  Globe,
  ArrowUpRight,
} from 'lucide-vue-next';

const router = useRouter();

const searchQuery = ref('');
const activeCategory = ref('all');
const assets = ref<Asset[]>([]);
const isLoadingAssets = ref(true);

// Hero entrance state
const heroVisible = ref(false);

// Animated stats
const stats = ref([
  { label: 'Total Aset', value: 2847, suffix: '+', current: 0 },
  { label: 'Kreator Aktif', value: 430, suffix: '', current: 0 },
  { label: 'Transaksi Sukses', value: 98, suffix: '%', current: 0 },
]);

const curatedFallbackAssets: Asset[] = [
  {
    id: 'asset-1',
    sellerId: 'user-1',
    categoryId: 'cat-1',
    title: 'Nexus SaaS Dashboard & UI Kit',
    slug: 'nexus-saas-dashboard-ui-kit',
    shortDescription: 'Production-ready Vue 3 & Tailwind dark-mode admin template with 60+ components.',
    description: 'Complete SaaS starter kit with auth flows, analytics charts, and responsive layouts.',
    assetType: 'ui_template',
    status: 'approved',
    price: 349000,
    discountPrice: 289000,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    previewImages: [],
    tags: ['Vue 3', 'Tailwind', 'SaaS', 'Dark Mode'],
    downloadCount: 342,
    viewCount: 1820,
    ratingAvg: 4.95,
    ratingCount: 38,
    seller: { id: 'seller-1', name: 'VoxelCraft Studio', isVerifiedSeller: true },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-2',
    sellerId: 'user-2',
    categoryId: 'cat-2',
    title: 'Neon Cyberpunk 3D Character Rig',
    slug: 'neon-cyberpunk-3d-character-rig',
    shortDescription: 'High-poly rigged sci-fi model with 4K PBR textures for Blender and Unreal Engine 5.',
    description: 'Fully facial-rigged futuristic avatar ready for games and cinematics.',
    assetType: '3d_model',
    status: 'approved',
    price: 499000,
    discountPrice: null,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    previewImages: [],
    tags: ['Blender', 'UE5', 'Rigged', 'PBR'],
    downloadCount: 189,
    viewCount: 940,
    ratingAvg: 4.88,
    ratingCount: 22,
    seller: { id: 'seller-2', name: 'ApexPolygons', isVerifiedSeller: true },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-3',
    sellerId: 'user-3',
    categoryId: 'cat-3',
    title: 'Fintech Microservices Backend Starter',
    slug: 'fintech-microservices-backend-starter',
    shortDescription: 'Clean architecture Hono + Drizzle + PostgreSQL microservice suite with JWT auth & tests.',
    description: 'Enterprise grade modular backend starter with rate limiting, audit logs, and Neon DB.',
    assetType: 'source_code',
    status: 'approved',
    price: 420000,
    discountPrice: 350000,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    previewImages: [],
    tags: ['Hono', 'TypeScript', 'Drizzle', 'Postgres'],
    downloadCount: 520,
    viewCount: 3100,
    ratingAvg: 4.98,
    ratingCount: 64,
    seller: { id: 'seller-3', name: 'StackArch Labs', isVerifiedSeller: true },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-4',
    sellerId: 'user-4',
    categoryId: 'cat-4',
    title: 'Aura Luxury 3D Icon Pack (120+ Assets)',
    slug: 'aura-luxury-3d-icon-pack',
    shortDescription: 'Modern glassmorphic and matte 3D icons rendered in 4K resolution with transparent alpha.',
    description: '120+ unique 3D icons for fintech, crypto, e-commerce, and creative portfolios.',
    assetType: 'graphic',
    status: 'approved',
    price: 199000,
    discountPrice: 159000,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=800&q=80',
    previewImages: [],
    tags: ['3D Icons', 'Figma', 'Render', 'Glassmorphism'],
    downloadCount: 412,
    viewCount: 2210,
    ratingAvg: 4.92,
    ratingCount: 45,
    seller: { id: 'seller-4', name: 'Lumina Design Lab', isVerifiedSeller: true },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-5',
    sellerId: 'user-5',
    categoryId: 'cat-5',
    title: 'Cinematic Ambient Soundscapes & SFX',
    slug: 'cinematic-ambient-soundscapes-sfx',
    shortDescription: 'Lossless WAV audio library containing 80 atmospheric drones, risers, and impact hits.',
    description: 'High-definition sound library for game developers, filmmakers, and UI sound effects.',
    assetType: 'audio',
    status: 'approved',
    price: 249000,
    discountPrice: null,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80',
    previewImages: [],
    tags: ['WAV', 'Audio', 'SFX', 'Ambient'],
    downloadCount: 175,
    viewCount: 880,
    ratingAvg: 4.91,
    ratingCount: 19,
    seller: { id: 'seller-5', name: 'Resonance Studio', isVerifiedSeller: true },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'asset-6',
    sellerId: 'user-6',
    categoryId: 'cat-6',
    title: 'Minimalist Editorial Portfolio Template',
    slug: 'minimalist-editorial-portfolio-template',
    shortDescription: 'Ultra-fast Next.js 14 and Tailwind website template with smooth page transitions.',
    description: 'Designed specifically for creative directors, architects, and senior engineers.',
    assetType: 'ui_template',
    status: 'approved',
    price: 299000,
    discountPrice: 249000,
    currency: 'IDR',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    previewImages: [],
    tags: ['Next.js', 'Editorial', 'Minimal', 'Portfolio'],
    downloadCount: 280,
    viewCount: 1650,
    ratingAvg: 4.97,
    ratingCount: 31,
    seller: { id: 'seller-6', name: 'Atelier Monochrome', isVerifiedSeller: true },
    createdAt: new Date().toISOString(),
  },
];

const categoryPillars = [
  {
    type: 'ui_template',
    title: 'UI & Web Templates',
    desc: 'Dashboards, landing pages, dan sistem desain siap pakai.',
    icon: Layout,
    count: '140+ Item',
    color: 'primary',
  },
  {
    type: 'source_code',
    title: 'Source Code & Starters',
    desc: 'Boilerplate microservice, backend API, & repositori bersih.',
    icon: Code2,
    count: '95+ Repositori',
    color: 'secondary',
  },
  {
    type: '3d_model',
    title: '3D Models & PBR Rigs',
    desc: 'Aset game-ready, karakter rigged, dan render fotorealistik.',
    icon: Box,
    count: '210+ Model',
    color: 'primary',
  },
  {
    type: 'graphic',
    title: 'Graphics & Visual Kits',
    desc: 'Icon packs, ilustrasi vektor, dan mockup produk resolusi tinggi.',
    icon: Palette,
    count: '180+ Koleksi',
    color: 'secondary',
  },
  {
    type: 'audio',
    title: 'Audio, SFX & Scoring',
    desc: 'Soundtrack komersial, sound effects antarmuka, & audio lossless.',
    icon: Music2,
    count: '75+ Paket',
    color: 'primary',
  },
  {
    type: 'document',
    title: 'Dokumentasi & Blueprint',
    desc: 'Arsitektur sistem, panduan teknis, dan cetak biru perangkat lunak.',
    icon: FileCheck,
    count: '50+ Blueprint',
    color: 'secondary',
  },
];

// Intersection Observer for scroll reveals
let observer: IntersectionObserver | null = null;

function initScrollReveal() {
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((el) => {
    observer!.observe(el);
  });
}

// Animated number counter
function animateCounter(target: number, duration = 1800): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      resolve(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function runCounters() {
  for (const stat of stats.value) {
    stat.current = await animateCounter(stat.value, 1600);
  }
}

onMounted(async () => {
  // Trigger hero entrance
  requestAnimationFrame(() => {
    heroVisible.value = true;
  });

  // Init scroll reveals
  await new Promise((r) => setTimeout(r, 100));
  initScrollReveal();

  // Load assets
  await loadAssets();

  // Run counters when stats come into view
  const statsEl = document.getElementById('stats-bar');
  if (statsEl) {
    const statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          runCounters();
          statsObserver.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    statsObserver.observe(statsEl);
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

async function loadAssets() {
  isLoadingAssets.value = true;
  try {
    const data = await assetService.getPublicAssets({ limit: 6, sort: 'newest' });
    assets.value = data.assets && data.assets.length > 0 ? data.assets : curatedFallbackAssets;
  } catch {
    assets.value = curatedFallbackAssets;
  } finally {
    isLoadingAssets.value = false;
  }
}

function handleSearchSubmit() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/explore', query: { q: searchQuery.value.trim() } });
  } else {
    router.push('/explore');
  }
}

function filterByCategory(type: string) {
  activeCategory.value = type;
  assets.value = type === 'all' ? curatedFallbackAssets : curatedFallbackAssets.filter((a) => a.assetType === type);
}

function setSearch(val: string) {
  searchQuery.value = val;
  handleSearchSubmit();
}
</script>

<template>
  <div class="relative overflow-hidden">

    <!-- ════════════════════════════════════════
         HERO — Editorial Luxury Masthead
         ════════════════════════════════════════ -->
    <section class="relative pt-16 pb-24 lg:pt-24 lg:pb-36 overflow-hidden">
      <!-- Layered ambient atmosphere -->
      <div class="pointer-events-none absolute inset-0">
        <!-- Primary glow top-left -->
        <div class="absolute -top-32 -left-24 h-[520px] w-[520px] rounded-full bg-primary/12 blur-[80px] animate-float-slow"></div>
        <!-- Secondary glow right -->
        <div class="absolute top-1/3 -right-16 h-[420px] w-[420px] rounded-full bg-secondary/8 blur-[70px] animate-float-slow" style="animation-delay: -3s"></div>
        <!-- Tertiary dot accent -->
        <div class="absolute bottom-12 left-1/3 h-[200px] w-[200px] rounded-full bg-primary/6 blur-[50px] animate-float-slow" style="animation-delay: -5s"></div>
        <!-- Dot grid texture -->
        <div class="absolute inset-0 opacity-[0.025]"
          style="background-image: radial-gradient(circle, #F5F2ED 1px, transparent 1px); background-size: 28px 28px;">
        </div>
        <!-- Top gradient line -->
        <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent"></div>
      </div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center min-h-[580px]">

          <!-- Left: Hero Content -->
          <div class="lg:col-span-7 space-y-7">
            <!-- Eyebrow -->
            <div
              class="inline-flex items-center gap-2.5"
              :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
              style="transition: all 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s"
            >
              <div class="h-px w-8 bg-secondary"></div>
              <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">Premium Digital Marketplace</span>
            </div>

            <!-- Headline -->
            <h1
              class="font-heading text-[3.2rem] sm:text-[4rem] md:text-[4.8rem] lg:text-[5.5rem] font-bold tracking-tight text-text-primary leading-[0.92]"
              :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
              style="transition: all 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s"
            >
              Crafted for<br />
              <span class="text-gradient-primary italic">Visionaries</span>,<br />
              Built to Ship.
            </h1>

            <!-- Subheadline -->
            <p
              class="text-sm text-text-secondary max-w-lg leading-[1.8]"
              :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
              style="transition: all 0.7s cubic-bezier(0.22,1,0.36,1) 0.35s"
            >
              Jelajahi UI templates eksklusif, repositori source code berarsitektur bersih, model 3D game-ready, dan aset grafis berkualitas tinggi. Didukung verifikasi manual dan bagi hasil <strong class="text-text-primary">60% untuk kreator</strong>.
            </p>

            <!-- Search Bar -->
            <div
              class="max-w-xl"
              :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
              style="transition: all 0.7s cubic-bezier(0.22,1,0.36,1) 0.45s"
            >
              <form @submit.prevent="handleSearchSubmit" class="relative flex items-center">
                <Search class="absolute left-4 h-4 w-4 text-text-muted pointer-events-none" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari aset digital (contoh: Vue 3 SaaS, Hono Drizzle, Blender Rig)..."
                  class="w-full rounded-2xl border border-border/60 bg-elevated/90 py-4 pl-11 pr-28 text-xs text-text-primary placeholder:text-text-muted/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/15 shadow-xl shadow-black/30 transition-all duration-200"
                />
                <button
                  type="submit"
                  class="absolute right-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover transition cursor-pointer shadow-lg shadow-primary/20 active:scale-[0.97]"
                >
                  Cari
                </button>
              </form>

              <!-- Trending chips -->
              <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                <span class="font-semibold text-text-muted mr-0.5">Tren:</span>
                <button
                  v-for="chip in ['Vue 3 SaaS', 'PostgreSQL', 'Blender Rig', 'Tailwind Kit']"
                  :key="chip"
                  class="rounded-full bg-surface/80 border border-border/50 px-2.5 py-0.5 hover:text-text-primary hover:border-border-hover transition-all duration-200 active:scale-95"
                  @click="setSearch(chip)"
                >
                  {{ chip }}
                </button>
              </div>
            </div>

            <!-- CTA Buttons -->
            <div
              class="flex flex-wrap items-center gap-3"
              :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
              style="transition: all 0.7s cubic-bezier(0.22,1,0.36,1) 0.55s"
            >
              <router-link
                to="/explore"
                class="inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 text-xs font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-[0.97] transition-all duration-200"
              >
                Jelajahi Katalog
                <ArrowRight class="h-4 w-4" />
              </router-link>

              <router-link
                to="/panduan"
                class="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-elevated/80 px-6 py-4 text-xs font-bold text-text-primary hover:border-secondary/50 hover:text-secondary transition-all duration-200 backdrop-blur-sm"
              >
                <BookOpen class="h-4 w-4" />
                Panduan Kreator
              </router-link>
            </div>

            <!-- Trust strip -->
            <div
              class="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-text-secondary border-t border-border/40 pt-4"
              :class="heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'"
              style="transition: all 0.7s cubic-bezier(0.22,1,0.36,1) 0.65s"
            >
              <div class="flex items-center gap-1.5">
                <CheckCircle2 class="h-3.5 w-3.5 text-success" />
                <span>100% Moderasi Admin</span>
              </div>
              <div class="flex items-center gap-1.5">
                <Coins class="h-3.5 w-3.5 text-secondary" />
                <span>60% Bagi Hasil Kreator</span>
              </div>
              <div class="flex items-center gap-1.5">
                <Lock class="h-3.5 w-3.5 text-primary" />
                <span>Escrow Bank Manual</span>
              </div>
            </div>
          </div>

          <!-- Right: Floating Spotlight Card -->
          <div
            class="lg:col-span-5"
            :class="heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'"
            style="transition: all 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s"
          >
            <div class="relative animate-float">
              <!-- Glow halo behind card -->
              <div class="absolute inset-0 rounded-[2rem] bg-primary/20 blur-[40px] scale-95 -z-10 animate-pulse-ring"></div>

              <!-- Card -->
              <div class="relative rounded-3xl border border-border/60 bg-elevated/80 p-4 sm:p-5 backdrop-blur-xl shadow-2xl shadow-black/60 animate-glow-pulse transition hover:border-border-hover">

                <!-- Window chrome -->
                <div class="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-red-500/80"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-yellow-500/80"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-green-500/80"></span>
                  </div>
                  <span class="text-[10px] font-mono text-text-muted">ASSET_PREVIEW.KIT</span>
                  <span class="rounded bg-primary/20 text-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                    60/40 ✓
                  </span>
                </div>

                <!-- Thumbnail -->
                <div class="relative overflow-hidden rounded-2xl aspect-[16/10] bg-surface group">
                  <img
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                    alt="Spotlight Asset"
                    class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <!-- Overlays -->
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <!-- Floating pulse ring on image -->
                  <div class="absolute top-3 right-3">
                    <div class="relative">
                      <div class="absolute inset-0 rounded-full bg-success/40 animate-pulse-ring"></div>
                      <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                      </span>
                    </div>
                  </div>

                  <!-- Bottom info -->
                  <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <span class="rounded-full bg-surface/80 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-secondary">
                        UI Template
                      </span>
                      <h3 class="font-heading text-lg font-bold text-white mt-1 leading-tight">Nexus SaaS Dashboard</h3>
                    </div>
                    <div class="text-right">
                      <p class="text-[9px] text-white/60 line-through">Rp 349.000</p>
                      <p class="font-mono text-base font-bold text-white">Rp 289.000</p>
                    </div>
                  </div>
                </div>

                <!-- Stats grid -->
                <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div class="rounded-2xl border border-border/70 bg-surface/70 p-2.5">
                    <span class="text-[9px] text-text-muted block mb-0.5">Hak Kreator</span>
                    <span class="font-mono font-bold text-success text-[11px]">60%</span>
                  </div>
                  <div class="rounded-2xl border border-border/70 bg-surface/70 p-2.5">
                    <div class="flex items-center justify-center gap-0.5 mb-0.5">
                      <Star class="h-3 w-3 fill-amber-400 text-amber-400 animate-twinkle" />
                      <span class="font-mono font-bold text-amber-400 text-[11px]">4.98</span>
                    </div>
                    <span class="text-[9px] text-text-muted">38 reviews</span>
                  </div>
                  <div class="rounded-2xl border border-border/70 bg-surface/70 p-2.5">
                    <span class="text-[9px] text-text-muted block mb-0.5">Terjual</span>
                    <span class="font-mono font-bold text-text-primary text-[11px]">342×</span>
                  </div>
                </div>

                <!-- Notification -->
                <div class="mt-3 flex items-center justify-between rounded-2xl border border-success/25 bg-success/8 px-3.5 py-2 text-[10px] text-success animate-notif">
                  <div class="flex items-center gap-1.5">
                    <ShieldCheck class="h-3.5 w-3.5 shrink-0" />
                    <span class="font-medium">Payout Berhasil • BCA</span>
                  </div>
                  <span class="font-mono font-bold">+Rp 14.850.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         STATS BAR
         ════════════════════════════════════════ -->
    <div
      id="stats-bar"
      class="border-y border-border/30 bg-elevated/40"
    >
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-3 gap-6 lg:gap-12">
          <div
            v-for="(stat, i) in stats"
            :key="stat.label"
            class="reveal text-center"
            :class="'delay-' + (i + 1)"
          >
            <div class="font-heading text-3xl sm:text-4xl font-bold text-text-primary tabular-nums">
              {{ stat.current.toLocaleString() }}{{ stat.suffix }}
            </div>
            <div class="mt-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              {{ stat.label }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════
         CATEGORY GRID
         ════════════════════════════════════════ -->
    <section class="py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Section header -->
        <div class="text-center max-w-2xl mx-auto mb-14 reveal">
          <div class="inline-flex items-center gap-2 mb-4">
            <div class="h-px w-6 bg-secondary"></div>
            <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary">Kategori</span>
            <div class="h-px w-6 bg-secondary"></div>
          </div>
          <h2 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
            Aset Digital untuk <span class="text-primary italic">Setiap Kebutuhan</span>
          </h2>
          <p class="mt-3 text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
            Pilih dari ribuan berkas digital terverifikasi yang siap diintegrasikan ke alur kerja produksi Anda.
          </p>
        </div>

        <!-- Category cards grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <router-link
            v-for="(cat, i) in categoryPillars"
            :key="cat.type"
            :to="`/explore?type=${cat.type}`"
            class="cat-card reveal rounded-2xl border border-border/50 bg-elevated/50 p-6 group relative overflow-hidden"
            :class="'delay-' + ((i % 3) + 1)"
          >
            <!-- Hover fill -->
            <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              :class="cat.color === 'primary' ? 'bg-primary/5' : 'bg-secondary/5'"
            ></div>

            <div class="relative flex items-center justify-between mb-5">
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 text-text-secondary group-hover:border-primary/40 group-hover:text-primary transition-all duration-300"
                :class="cat.color === 'primary' ? 'group-hover:bg-primary/10' : 'group-hover:bg-secondary/10 group-hover:border-secondary/40 group-hover:text-secondary'"
              >
                <component :is="cat.icon" class="h-5.5 w-5.5" />
              </div>
              <div class="flex items-center gap-1 text-[10px] font-mono font-semibold text-text-muted group-hover:text-text-secondary transition-colors">
                <TrendingUp class="h-3 w-3" />
                {{ cat.count }}
              </div>
            </div>

            <h3 class="font-heading text-xl font-bold text-text-primary group-hover:text-primary transition-colors duration-300 mb-1.5">
              {{ cat.title }}
            </h3>
            <p class="text-xs text-text-secondary leading-relaxed mb-4">
              {{ cat.desc }}
            </p>

            <div class="flex items-center gap-1.5 text-[11px] font-semibold transition-colors duration-300"
              :class="cat.color === 'primary' ? 'text-primary group-hover:gap-2.5' : 'text-secondary group-hover:gap-2.5'"
            >
              <span>Jelajahi</span>
              <ArrowUpRight class="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         FEATURE 1: MODERATION (Left text, Right card)
         ════════════════════════════════════════ -->
    <section class="py-20 lg:py-28 border-t border-border/20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          <!-- Text -->
          <div class="lg:col-span-6 reveal-left space-y-5">
            <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-xs font-bold text-primary">
              <ShieldAlert class="h-3.5 w-3.5" />
              <span>Standar Kurasi Ketat</span>
            </div>
            <h2 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
              Setiap Aset <span class="text-primary italic">Ditinjau Manual</span><br class="hidden sm:block" /> Sebelum Terbit.
            </h2>
            <p class="text-sm text-text-secondary leading-[1.8]">
              Tidak ada tempat bagi kode rusak atau file berkualitas rendah. Tim administrator membedah setiap file arsip (.zip), memvalidasi struktur dependensi, lisensi pustaka pihak ketiga, dan integritas visual sebelum aset muncul di etalase publik.
            </p>
            <ul class="space-y-3 text-sm text-text-secondary">
              <li class="flex items-start gap-3">
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 class="h-3 w-3" />
                </div>
                <span>Pemeriksaan berkas arsip anti-malware dan anti-script berbahaya.</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 class="h-3 w-3" />
                </div>
                <span>Verifikasi kesesuaian gambar thumbnail dan file demo.</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 class="h-3 w-3" />
                </div>
                <span>Pencatatan alasan penolakan spesifik jika revisi dibutuhkan.</span>
              </li>
            </ul>
          </div>

          <!-- Moderation checklist card -->
          <div class="lg:col-span-6 reveal-right">
            <div class="rounded-3xl border border-border/60 bg-elevated/80 p-6 sm:p-8 backdrop-blur-sm shadow-2xl shadow-black/40">
              <div class="flex items-center justify-between pb-5 mb-5 border-b border-border/60">
                <span class="text-[11px] font-bold uppercase tracking-widest text-text-muted">Antrean Moderasi</span>
                <span class="rounded-full bg-success/15 border border-success/30 px-3 py-1 text-[10px] font-bold text-success flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                  Approved
                </span>
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/80 p-4 text-xs transition hover:bg-surface/100">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                      <FileCheck class="h-4 w-4" />
                    </div>
                    <div>
                      <p class="font-bold text-text-primary">Integritas File Arsip (.ZIP)</p>
                      <p class="text-[11px] text-text-muted mt-0.5">Tidak ada korupsi berkas, ekstraksi sukses.</p>
                    </div>
                  </div>
                  <CheckCircle2 class="h-4.5 w-4.5 text-success shrink-0" />
                </div>

                <div class="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/80 p-4 text-xs transition hover:bg-surface/100">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Palette class="h-4 w-4" />
                    </div>
                    <div>
                      <p class="font-bold text-text-primary">Thumbnail & Preview Visual</p>
                      <p class="text-[11px] text-text-muted mt-0.5">Resolusi tajam, rasio 16:9 sesuai standar.</p>
                    </div>
                  </div>
                  <CheckCircle2 class="h-4.5 w-4.5 text-success shrink-0" />
                </div>

                <div class="flex items-center justify-between rounded-2xl border border-border/60 bg-surface/80 p-4 text-xs transition hover:bg-surface/100">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Coins class="h-4 w-4" />
                    </div>
                    <div>
                      <p class="font-bold text-text-primary">Revenue 60% & Penetapan Harga</p>
                      <p class="text-[11px] text-text-muted mt-0.5">Perhitungan bagi hasil IDR terekam di ledger.</p>
                    </div>
                  </div>
                  <CheckCircle2 class="h-4.5 w-4.5 text-success shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         FEATURE 2: 60/40 CREATOR SPLIT
         ════════════════════════════════════════ -->
    <section class="py-20 lg:py-28 border-t border-border/20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          <!-- Card (left on desktop) -->
          <div class="lg:col-span-6 reveal-left order-2 lg:order-1">
            <div class="relative rounded-3xl border border-border/60 bg-gradient-to-br from-elevated via-surface/90 to-background p-7 sm:p-9 shadow-2xl shadow-black/40 overflow-hidden">
              <!-- Background accent -->
              <div class="absolute top-0 right-0 h-48 w-48 rounded-full bg-secondary/8 blur-[50px] pointer-events-none"></div>

              <div class="relative">
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary block mb-6">
                  Simulasi Pendapatan Kreator
                </span>

                <div class="grid grid-cols-2 gap-4 mb-5">
                  <div class="rounded-2xl border border-secondary/30 bg-secondary/8 p-5 text-center">
                    <p class="text-[10px] text-text-muted uppercase tracking-wider mb-2">Porsi Kreator</p>
                    <p class="font-heading text-4xl font-bold text-secondary">60%</p>
                    <p class="text-[10px] text-text-muted mt-1.5">Rp 600.000<br />dari Rp 1.000.000</p>
                  </div>
                  <div class="rounded-2xl border border-border/60 bg-surface/80 p-5 text-center">
                    <p class="text-[10px] text-text-muted uppercase tracking-wider mb-2">Platform</p>
                    <p class="font-heading text-4xl font-bold text-text-primary/70">40%</p>
                    <p class="text-[10px] text-text-muted mt-1.5">Hosting, Escrow<br />&amp; Support</p>
                  </div>
                </div>

                <!-- Revenue bar -->
                <div class="rounded-xl bg-surface/60 p-4 mb-4">
                  <div class="flex items-center justify-between text-[10px] text-text-muted mb-2">
                    <span>Distribusi Penjualan</span>
                    <span>Rp 1.000.000</span>
                  </div>
                  <div class="flex h-2.5 rounded-full overflow-hidden gap-0.5">
                    <div class="bg-secondary rounded-full" style="width: 60%"></div>
                    <div class="bg-border rounded-full" style="width: 40%"></div>
                  </div>
                  <div class="flex items-center justify-between mt-2 text-[10px]">
                    <span class="text-secondary font-semibold">60% → Kreator</span>
                    <span class="text-text-muted">40% → Platform</span>
                  </div>
                </div>

                <div class="flex items-center gap-2.5 rounded-xl border border-border/50 bg-surface/40 px-4 py-3 text-xs text-text-secondary">
                  <Zap class="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Pencairan ke <strong class="text-text-primary">BCA, Mandiri, BNI, BRI</strong> — tanpa minimum harian</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Text (right on desktop) -->
          <div class="lg:col-span-6 reveal-right order-1 lg:order-2 space-y-5">
            <div class="inline-flex items-center gap-2 rounded-full bg-secondary/10 border border-secondary/20 px-3.5 py-1.5 text-xs font-bold text-secondary">
              <TrendingUp class="h-3.5 w-3.5" />
              <span>Ekonomi Kreator Berkeadilan</span>
            </div>
            <h2 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
              Kreator Mendapatkan <span class="text-secondary italic">60%</span><br class="hidden sm:block" /> dari Setiap Penjualan.
            </h2>
            <p class="text-sm text-text-secondary leading-[1.8]">
              Kami percaya karya terbaik lahir saat kreator dihargai secara pantas. Tidak seperti platform konvensional yang memotong hingga 70%, Asset Market menerapkan formula 60% hak kreator dan 40% komisi operasional marketplace.
            </p>
            <div class="pt-1 flex items-center gap-3">
              <router-link
                to="/panduan"
                class="inline-flex items-center gap-2 rounded-2xl bg-secondary px-6 py-3.5 text-xs font-bold text-background shadow-lg shadow-secondary/20 hover:bg-secondary-hover transition-all duration-200 active:scale-[0.97]"
              >
                <span>Pelajari Cara Menual Aset</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </router-link>
              <div class="flex items-center gap-2 text-xs text-text-secondary">
                <Users class="h-4 w-4 text-text-muted" />
                <span>430+ kreator aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         FEATURED ASSETS SHOWCASE
         ════════════════════════════════════════ -->
    <section
      id="featured-assets"
      class="py-20 lg:py-28 border-t border-border/20 bg-elevated/15 overflow-hidden"
    >
      <!-- Background subtle radial glow -->
      <div class="pointer-events-none absolute inset-0 opacity-40"
        style="background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(217, 58, 15, 0.06) 0%, transparent 70%);">
      </div>

      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <!-- ── Section Header ── -->
        <div class="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6 reveal">

          <!-- Left: Typography -->
          <div class="max-w-md">
            <div class="inline-flex items-center gap-2 mb-4">
              <Sparkles class="h-4 w-4 text-primary" />
              <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Etalase Pilihan Editor</span>
            </div>
            <h2 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight mb-2">
              Aset Digital<br /><span class="text-primary italic">Unggulan</span>
            </h2>
            <p class="text-xs text-text-secondary leading-relaxed max-w-sm">
              Seleksi aset terbaik yang telah lulus moderasi ketat dan mendapat respons positif dari komunitas kreator.
            </p>
          </div>

          <!-- Right: Category filter pills -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="f in [
                { id: 'all', label: 'Semua' },
                { id: 'ui_template', label: 'UI Templates' },
                { id: 'source_code', label: 'Source Code' },
                { id: '3d_model', label: '3D Models' },
                { id: 'graphic', label: 'Graphics' },
              ]"
              :key="f.id"
              class="relative rounded-full px-4 py-1.5 text-[11px] font-semibold transition-all duration-250 cursor-pointer active:scale-95 overflow-hidden"
              :class="
                activeCategory === f.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 z-10'
                  : 'bg-surface/70 border border-border/60 text-text-secondary hover:text-text-primary hover:border-border/80 backdrop-blur-sm'
              "
              @click="filterByCategory(f.id)"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <!-- ── Results Meta Bar ── -->
        <div class="flex items-center justify-between mb-6 px-0.5">
          <p class="text-[11px] text-text-muted">
            Menampilkan
            <span class="font-bold text-text-secondary tabular-nums">{{ assets.length }}</span>
            aset
            <span v-if="activeCategory !== 'all'" class="text-text-muted">
              dalam kategori
              <strong class="text-text-secondary capitalize">{{ activeCategory.replace('_', ' ') }}</strong>
            </span>
          </p>
          <!-- Animated indicator dot -->
          <div class="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span
              class="inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300"
              :class="isLoadingAssets ? 'bg-amber-400 animate-ping' : 'bg-success'"
            ></span>
            <span>{{ isLoadingAssets ? 'Memuat...' : 'Tersedia' }}</span>
          </div>
        </div>

        <!-- ── Loading Skeleton Grid ── -->
        <div
          v-if="isLoadingAssets"
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <div
            v-for="n in 6"
            :key="n"
            class="rounded-2xl border border-border/40 bg-elevated overflow-hidden"
            :style="{ animation: `fadeInUp 0.4s ease-out ${(n - 1) * 60}ms both` }"
          >
            <!-- Thumbnail -->
            <div class="aspect-[4/3] skeleton-shimmer"></div>
            <!-- Body -->
            <div class="p-5 space-y-3">
              <div class="flex justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-[18px] w-[18px] rounded-full skeleton-shimmer"></div>
                  <div class="h-3 w-24 skeleton-shimmer rounded"></div>
                </div>
                <div class="h-3 w-12 skeleton-shimmer rounded"></div>
              </div>
              <div class="space-y-1.5">
                <div class="h-5 w-[85%] skeleton-shimmer rounded-md"></div>
                <div class="h-5 w-[55%] skeleton-shimmer rounded-md"></div>
              </div>
              <div class="space-y-1">
                <div class="h-3 w-full skeleton-shimmer rounded"></div>
                <div class="h-3 w-3/4 skeleton-shimmer rounded"></div>
              </div>
              <div class="flex gap-2 pt-1">
                <div class="h-[18px] w-12 skeleton-shimmer rounded"></div>
                <div class="h-[18px] w-16 skeleton-shimmer rounded"></div>
              </div>
              <div class="flex items-end justify-between border-t border-border/30 pt-4">
                <div class="space-y-1">
                  <div class="h-2 w-8 skeleton-shimmer rounded"></div>
                  <div class="h-5 w-24 skeleton-shimmer rounded"></div>
                </div>
                <div class="h-10 w-20 skeleton-shimmer rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Asset Grid ── -->
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <div
            v-for="(asset, i) in assets"
            :key="asset.id"
            :style="{ animation: `fadeInUp 0.5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` }"
          >
            <AssetCard :asset="asset" />
          </div>
        </div>

        <!-- ── Empty State for Filtered Results ── -->
        <div
          v-if="!isLoadingAssets && assets.length === 0"
          class="flex flex-col items-center justify-center py-20 rounded-3xl border border-border/30 bg-elevated/40 text-center"
        >
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border/50 mb-4">
            <Search class="h-6 w-6 text-text-muted" />
          </div>
          <h3 class="font-heading text-xl font-bold text-text-primary mb-1.5">
            Tidak ada aset di kategori ini
          </h3>
          <p class="text-xs text-text-secondary max-w-xs leading-relaxed mb-5">
            Belum ada aset yang cocok dengan filter ini. Coba pilih kategori lain atau jelajahi seluruh katalog.
          </p>
          <button
            class="rounded-xl bg-primary/10 border border-primary/20 px-5 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            @click="filterByCategory('all')"
          >
            Lihat Semua Aset
          </button>
        </div>

        <!-- ── Section CTA ── -->
        <div class="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/20">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 text-[11px] text-text-muted">
              <CheckCircle2 class="h-3.5 w-3.5 text-success" />
              <span>Semua aset sudah terverifikasi admin</span>
            </div>
          </div>
          <router-link
            to="/explore"
            class="group inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-elevated/80 px-6 py-3 text-xs font-bold text-text-primary hover:border-primary/50 hover:text-primary transition-all duration-200 backdrop-blur-sm active:scale-[0.97]"
          >
            Jelajahi Seluruh Katalog
            <ArrowRight class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </router-link>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         HOW IT WORKS — Editorial 3-Step
         ════════════════════════════════════════ -->
    <section class="py-24 lg:py-32 border-t border-border/20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Header -->
        <div class="text-center max-w-2xl mx-auto mb-16 lg:mb-20 reveal">
          <div class="inline-flex items-center gap-2 mb-4">
            <div class="h-px w-6 bg-secondary"></div>
            <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary">3 Langkah Mudah</span>
            <div class="h-px w-6 bg-secondary"></div>
          </div>
          <h2 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-tight">
            Bagaimana<br /><span class="text-secondary italic">Pembelian</span> Bekerja?
          </h2>
          <p class="mt-4 text-xs sm:text-sm text-text-secondary leading-relaxed">
            Tiga langkah sederhana, transparan, dan terverifikasi untuk memiliki aset digital impian Anda.
          </p>
        </div>

        <!-- Steps -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          <!-- Step 01 -->
          <div class="reveal delay-1 relative">
            <div class="border-t-2 border-border/70 pt-8">
              <span class="font-heading text-6xl sm:text-7xl font-light text-text-muted/30 select-none block mb-3 transition-colors duration-500 group-hover:text-primary">
                01
              </span>
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Search class="h-4 w-4" />
                </div>
                <h3 class="font-heading text-lg font-bold text-text-primary">Pilih & Checkout</h3>
              </div>
              <p class="text-xs sm:text-sm text-text-secondary leading-[1.8]">
                Jelajahi kurasi aset berkualitas, periksa preview dan demo langsung, lalu selesaikan pesanan via Buy Now atau keranjang.
              </p>
            </div>
            <!-- Connector arrow (hidden on mobile) -->
            <div class="hidden md:block absolute top-1/2 -right-5 transform -translate-y-1/2 text-border/50">
              <ArrowRight class="h-5 w-5" />
            </div>
          </div>

          <!-- Step 02 -->
          <div class="reveal delay-2 relative">
            <div class="border-t-2 border-secondary/50 pt-8">
              <span class="font-heading text-6xl sm:text-7xl font-light text-text-muted/30 select-none block mb-3 transition-colors duration-500">
                02
              </span>
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                  <Lock class="h-4 w-4" />
                </div>
                <h3 class="font-heading text-lg font-bold text-text-primary">Transfer & Bukti</h3>
              </div>
              <p class="text-xs sm:text-sm text-text-secondary leading-[1.8]">
                Lakukan pembayaran ke rekening escrow resmi (BCA, Mandiri, BNI, BRI) dan upload foto/screenshot bukti transfer.
              </p>
            </div>
            <div class="hidden md:block absolute top-1/2 -right-5 transform -translate-y-1/2 text-border/50">
              <ArrowRight class="h-5 w-5" />
            </div>
          </div>

          <!-- Step 03 -->
          <div class="reveal delay-3">
            <div class="border-t-2 border-success/50 pt-8">
              <span class="font-heading text-6xl sm:text-7xl font-light text-text-muted/30 select-none block mb-3 transition-colors duration-500">
                03
              </span>
              <div class="flex items-center gap-2 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-success/10 text-success border border-success/20">
                  <CheckCircle2 class="h-4 w-4" />
                </div>
                <h3 class="font-heading text-lg font-bold text-text-primary">Verifikasi & Unduh</h3>
              </div>
              <p class="text-xs sm:text-sm text-text-secondary leading-[1.8]">
                Admin verifikasi dana masuk, bagi hasil 60% langsung dicatat ke kreator, dan file arsip aktif di akun Anda selamanya.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════
         FINAL CTA — Dramatic Footer
         ════════════════════════════════════════ -->
    <section class="relative py-28 lg:py-40 overflow-hidden border-t border-border/20">
      <!-- Background atmosphere -->
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute inset-0 opacity-[0.04]"
          style="background-image: radial-gradient(circle, #F5F2ED 1px, transparent 1px); background-size: 24px 24px;">
        </div>
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px] pointer-events-none"></div>
        <div class="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
      </div>

      <div class="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <!-- Eyebrow -->
        <div class="reveal inline-flex items-center gap-2 mb-6">
          <Globe class="h-4 w-4 text-secondary" />
          <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-secondary">Mulai Hari Ini</span>
        </div>

        <!-- Headline -->
        <h2
          class="reveal delay-1 font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.05] mb-6"
        >
          Siap Meluncurkan<br />
          <span class="text-gradient-primary italic">Karya Digital</span> Impian Anda?
        </h2>

        <!-- Sub -->
        <p
          class="reveal delay-2 text-sm text-text-secondary max-w-xl mx-auto leading-[1.8] mb-10"
        >
          Daftar sekarang untuk mulai menjual karya berlisensi dengan bagi hasil 60%, atau temukan ribuan aset premium untuk mempercepat rilis produk Anda.
        </p>

        <!-- CTAs -->
        <div
          class="reveal delay-3 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <router-link
            to="/register"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-9 py-4 text-xs sm:text-sm font-bold text-white shadow-xl shadow-primary/30 hover:bg-primary-hover active:scale-[0.97] transition-all duration-200"
          >
            <Zap class="h-4 w-4" />
            Buat Akun Sekarang
            <ArrowRight class="h-4 w-4" />
          </router-link>

          <router-link
            to="/panduan"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl border border-border/60 hover:border-secondary/40 bg-elevated/60 hover:bg-elevated px-9 py-4 text-xs sm:text-sm font-semibold text-text-primary hover:text-secondary transition-all duration-200 backdrop-blur-sm"
          >
            <BookOpen class="h-4 w-4" />
            Baca Panduan Pengguna
          </router-link>
        </div>
      </div>
    </section>

  </div>
</template>
