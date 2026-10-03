<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { assetService } from '../services/assets';
import AssetCard from '../components/AssetCard.vue';
import type { Asset } from '../types';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
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
} from 'lucide-vue-next';

const router = useRouter();

const searchQuery = ref('');
const activeCategory = ref('all');
const assets = ref<Asset[]>([]);
const isLoadingAssets = ref(true);

// Curated Fallback Assets with High-Res Visuals
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
    seller: {
      id: 'seller-1',
      name: 'VoxelCraft Studio',
      isVerifiedSeller: true,
    },
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
    seller: {
      id: 'seller-2',
      name: 'ApexPolygons',
      isVerifiedSeller: true,
    },
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
    seller: {
      id: 'seller-3',
      name: 'StackArch Labs',
      isVerifiedSeller: true,
    },
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
    seller: {
      id: 'seller-4',
      name: 'Lumina Design Lab',
      isVerifiedSeller: true,
    },
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
    seller: {
      id: 'seller-5',
      name: 'Resonance Studio',
      isVerifiedSeller: true,
    },
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
    seller: {
      id: 'seller-6',
      name: 'Atelier Monochrome',
      isVerifiedSeller: true,
    },
    createdAt: new Date().toISOString(),
  },
];

// Category Definitions with Icons
const categoryPillars = [
  {
    type: 'ui_template',
    title: 'UI & Web Templates',
    desc: 'Dashboards, landing pages, dan sistem desain siap pakai.',
    icon: Layout,
    count: '140+ Item',
  },
  {
    type: 'source_code',
    title: 'Source Code & Starters',
    desc: 'Boilerplate microservice, backend API, & repositori bersih.',
    icon: Code2,
    count: '95+ Repositori',
  },
  {
    type: '3d_model',
    title: '3D Models & PBR Rigs',
    desc: 'Aset game-ready, karakter rigged, dan render fotorealistik.',
    icon: Box,
    count: '210+ Model',
  },
  {
    type: 'graphic',
    title: 'Graphics & Visual Kits',
    desc: 'Icon packs, ilustrasi vektor, dan mockup produk resolusi tinggi.',
    icon: Palette,
    count: '180+ Koleksi',
  },
  {
    type: 'audio',
    title: 'Audio, SFX & Scoring',
    desc: 'Soundtrack komersial, sound effects antarmuka, & audio lossless.',
    icon: Music2,
    count: '75+ Paket',
  },
  {
    type: 'document',
    title: 'Dokumentasi & Blueprint',
    desc: 'Arsitektur sistem, panduan teknis, dan cetak biru perangkat lunak.',
    icon: FileCheck,
    count: '50+ Blueprint',
  },
];

onMounted(async () => {
  await loadAssets();
});

async function loadAssets() {
  isLoadingAssets.value = true;
  try {
    const data = await assetService.getPublicAssets({ limit: 6, sort: 'newest' });
    if (data.assets && data.assets.length > 0) {
      assets.value = data.assets;
    } else {
      assets.value = curatedFallbackAssets;
    }
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
  if (type === 'all') {
    assets.value = curatedFallbackAssets;
  } else {
    assets.value = curatedFallbackAssets.filter((a) => a.assetType === type);
  }
}
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- ========================================================================= -->
    <!-- EDITORIAL LUXURY HERO SWEEP -->
    <!-- ========================================================================= -->
    <section class="relative pt-16 pb-20 lg:pt-24 lg:pb-32">
      <!-- Ambient Glows -->
      <div class="pointer-events-none absolute -top-24 left-1/3 h-96 w-96 rounded-full bg-primary/15 blur-3xl"></div>
      <div class="pointer-events-none absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-secondary/10 blur-3xl"></div>

      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <!-- Left Column (Engaging Content & CTA) -->
          <div class="lg:col-span-7 space-y-7">
            <!-- Instrument Serif Hero Headline -->
            <h1 class="font-heading text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-text-primary leading-[1.05]">
              Crafted for <span class="italic text-primary">Visionaries</span>, Built to Ship Fast.
            </h1>

            <!-- Satoshi Body Text -->
            <p class="text-sm sm:text-base text-text-secondary max-w-xl font-normal leading-relaxed">
              Jelajahi UI templates eksklusif, repositori source code berarsitektur bersih, model 3D game-ready, dan aset grafis berkualitas tinggi. Didukung verifikasi transfer manual dan pembagian pendapatan <strong>60% untuk kreator</strong>.
            </p>

            <!-- Search Bar with Instant Submit -->
            <div class="max-w-xl">
              <form @submit.prevent="handleSearchSubmit" class="relative flex items-center">
                <Search class="absolute left-4 h-4 w-4 text-text-secondary" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari aset digital (contoh: Vue 3 SaaS, Hono Drizzle, Blender Rig)..."
                  class="w-full rounded-2xl border border-border bg-elevated/90 py-3.5 pl-11 pr-28 text-xs text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xl transition"
                />
                <button
                  type="submit"
                  class="absolute right-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition cursor-pointer"
                >
                  Cari
                </button>
              </form>

              <!-- Search suggestions -->
              <div class="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                <span class="font-semibold text-text-primary">Tren:</span>
                <button
                  @click="searchQuery = 'Vue 3 SaaS'; handleSearchSubmit()"
                  class="rounded-full bg-surface border border-border px-2.5 py-0.5 hover:text-text-primary transition"
                >
                  Vue 3 SaaS
                </button>
                <button
                  @click="searchQuery = 'PostgreSQL'; handleSearchSubmit()"
                  class="rounded-full bg-surface border border-border px-2.5 py-0.5 hover:text-text-primary transition"
                >
                  PostgreSQL
                </button>
                <button
                  @click="searchQuery = 'Blender'; handleSearchSubmit()"
                  class="rounded-full bg-surface border border-border px-2.5 py-0.5 hover:text-text-primary transition"
                >
                  Blender Rig
                </button>
                <button
                  @click="searchQuery = 'Tailwind'; handleSearchSubmit()"
                  class="rounded-full bg-surface border border-border px-2.5 py-0.5 hover:text-text-primary transition"
                >
                  Tailwind Kit
                </button>
              </div>
            </div>

            <!-- Dual Primary & Secondary Action CTAs -->
            <div class="pt-2 flex flex-wrap items-center gap-4">
              <router-link
                to="/explore"
                class="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-xs font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition"
              >
                <span>Jelajahi Katalog Marketplace</span>
                <ArrowRight class="h-4 w-4" />
              </router-link>

              <router-link
                to="/panduan"
                class="inline-flex items-center gap-2 rounded-2xl border border-border bg-elevated px-5 py-3.5 text-xs font-bold text-text-primary hover:border-secondary hover:text-secondary transition"
              >
                <BookOpen class="h-4 w-4" />
                <span>Panduan & Menjadi Kreator</span>
              </router-link>
            </div>

            <!-- Trust Metrics Strip -->
            <div class="pt-4 flex flex-wrap items-center gap-6 text-xs text-text-secondary border-t border-border/60">
              <div class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-success" />
                <span>100% Lulus Moderasi Admin</span>
              </div>
              <div class="flex items-center gap-2">
                <Coins class="h-4 w-4 text-secondary" />
                <span>60% Bagi Hasil Kreator</span>
              </div>
              <div class="flex items-center gap-2">
                <Lock class="h-4 w-4 text-primary" />
                <span>Escrow Bank Manual</span>
              </div>
            </div>
          </div>

          <!-- Right Column (Diagonal Endpoint: Luxury Spotlight Showcase Card) -->
          <div class="lg:col-span-5 relative">
            <!-- Glassmorphic Card Container -->
            <div class="relative mx-auto max-w-md rounded-3xl border border-border bg-elevated/70 p-4 sm:p-5 backdrop-blur-xl shadow-2xl transition hover:border-border-hover">
              <!-- Visual Mockup Window Header -->
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-border/80">
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-red-500/80"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-yellow-500/80"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-green-500/80"></span>
                </div>
                <span class="text-[10px] font-mono text-text-secondary">ASSET_PREVIEW_SPOTLIGHT.MP4</span>
                <span class="rounded bg-primary/20 text-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                  Verified 60/40
                </span>
              </div>

              <!-- High-res Thumbnail Preview -->
              <div class="relative overflow-hidden rounded-2xl aspect-[16/10] bg-surface">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
                  alt="Spotlight Asset Preview"
                  class="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                <!-- Price and Type Overlay -->
                <div class="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <span class="rounded-full bg-surface/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                      UI Template
                    </span>
                    <h3 class="font-heading text-lg font-bold text-white mt-1">
                      Nexus SaaS Dashboard Kit
                    </h3>
                  </div>
                  <div class="text-right">
                    <span class="font-mono text-base font-bold text-white">Rp 289.000</span>
                  </div>
                </div>
              </div>

              <!-- Floating Metadata & Stats -->
              <div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div class="rounded-2xl border border-border bg-surface/70 p-2.5">
                  <span class="text-[10px] text-text-secondary block">Hak Kreator (60%)</span>
                  <span class="font-mono font-bold text-success text-xs">Rp 173.400</span>
                </div>
                <div class="rounded-2xl border border-border bg-surface/70 p-2.5">
                  <span class="text-[10px] text-text-secondary block">Rating Pembeli</span>
                  <div class="flex items-center justify-center gap-1 font-bold text-yellow-400">
                    <Star class="h-3 w-3 fill-yellow-400" />
                    <span>4.98</span>
                  </div>
                </div>
                <div class="rounded-2xl border border-border bg-surface/70 p-2.5">
                  <span class="text-[10px] text-text-secondary block">Unduhan</span>
                  <span class="font-mono font-bold text-text-primary text-xs">342x</span>
                </div>
              </div>

              <!-- Floating Live Notification Badge -->
              <div class="mt-3 flex items-center justify-between rounded-2xl border border-success/30 bg-success/10 px-3.5 py-2 text-[11px] text-success">
                <div class="flex items-center gap-2">
                  <ShieldCheck class="h-4 w-4 shrink-0" />
                  <span class="font-medium">Pencairan Saldo Berhasil • Bank BCA</span>
                </div>
                <span class="font-mono font-bold">+Rp 14.850.000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- Z-PATTERN 3: MIDDLE HORIZONTAL DISCOVERY BAR (Category Grid) -->
    <!-- ========================================================================= -->
    <section class="border-y border-border bg-elevated/30 py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Section Header -->
        <div class="text-center max-w-2xl mx-auto mb-12">
          <span class="text-xs font-bold uppercase tracking-wider text-secondary">
            Kategori Aset Terpilih
          </span>
          <h2 class="font-heading text-3xl sm:text-4xl font-bold text-text-primary mt-1">
            Didesain untuk Efisiensi & Kualitas Tinggi
          </h2>
          <p class="text-xs text-text-secondary mt-2">
            Pilih dari ribuan berkas digital terverifikasi yang siap diintegrasikan ke alur kerja produksi Anda.
          </p>
        </div>

        <!-- 6 Category Pillar Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <router-link
            v-for="cat in categoryPillars"
            :key="cat.type"
            :to="`/explore?type=${cat.type}`"
            class="group rounded-3xl border border-border bg-elevated/60 p-6 backdrop-blur-md transition hover:border-primary hover:bg-elevated hover:-translate-y-1 shadow-lg"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-border text-primary group-hover:bg-primary group-hover:text-white transition">
                <component :is="cat.icon" class="h-6 w-6" />
              </div>
              <span class="text-[11px] font-mono font-semibold text-text-secondary">
                {{ cat.count }}
              </span>
            </div>

            <h3 class="font-heading text-xl font-bold text-text-primary group-hover:text-primary transition">
              {{ cat.title }}
            </h3>
            <p class="text-xs text-text-secondary mt-1.5 leading-relaxed">
              {{ cat.desc }}
            </p>

            <div class="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span>Jelajahi {{ cat.title }}</span>
              <ArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-1" />
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- Z-PATTERN 4: SECOND DIAGONAL SWEEP (Value Pillars: Moderation & 60/40 Split) -->
    <!-- ========================================================================= -->
    <section class="py-20 lg:py-28">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
        <!-- Feature 1: Strict Admin Moderation (Left Text, Right Card) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-6 space-y-4">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-bold text-primary">
              <ShieldAlert class="h-3.5 w-3.5" />
              <span>Standar Kurasi Ketat</span>
            </span>
            <h2 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
              Setiap Aset <span class="text-primary italic">Ditinjau Manual</span> Sebelum Terbit.
            </h2>
            <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Tidak ada tempat bagi kode rusak atau file berkualitas rendah. Tim administrator membedah setiap file arsip (.zip), memvalidasi struktur dependensi, lisensi pustaka pihak ketiga, dan integritas visual sebelum aset muncul di etalase publik.
            </p>
            <ul class="space-y-2.5 text-xs text-text-secondary pt-2">
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-success" />
                <span>Pemeriksaan berkas arsip anti-malware dan anti-script berbahaya.</span>
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-success" />
                <span>Verifikasi kesesuaian gambar thumbnail dan file demo.</span>
              </li>
              <li class="flex items-center gap-2">
                <CheckCircle2 class="h-4 w-4 text-success" />
                <span>Pencatatan alasan penolakan spesifik jika revisi dibutuhkan.</span>
              </li>
            </ul>
          </div>

          <div class="lg:col-span-6">
            <div class="rounded-3xl border border-border bg-elevated/70 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
              <div class="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span class="text-xs font-bold uppercase tracking-wider text-text-secondary">Antrean Moderasi Admin</span>
                <span class="rounded-full bg-success/15 border border-success/30 px-2.5 py-0.5 text-[10px] font-bold text-success">
                  Status: Approved
                </span>
              </div>
              <div class="space-y-3">
                <div class="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 text-xs">
                  <div class="flex items-center gap-3">
                    <FileCheck class="h-5 w-5 text-secondary" />
                    <div>
                      <span class="font-bold text-text-primary block">Integritas File Arsip (.ZIP)</span>
                      <span class="text-[11px] text-text-secondary">Tidak ada korupsi berkas, ekstraksi sukses.</span>
                    </div>
                  </div>
                  <CheckCircle2 class="h-4 w-4 text-success" />
                </div>

                <div class="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 text-xs">
                  <div class="flex items-center gap-3">
                    <Palette class="h-5 w-5 text-primary" />
                    <div>
                      <span class="font-bold text-text-primary block">Thumbnail & Preview Visual</span>
                      <span class="text-[11px] text-text-secondary">Resolusi tajam, rasio 16:9 sesuai standar.</span>
                    </div>
                  </div>
                  <CheckCircle2 class="h-4 w-4 text-success" />
                </div>

                <div class="flex items-center justify-between rounded-2xl border border-border bg-surface p-3.5 text-xs">
                  <div class="flex items-center gap-3">
                    <Coins class="h-5 w-5 text-yellow-400" />
                    <div>
                      <span class="font-bold text-text-primary block">Penetapan Harga & Revenue 60%</span>
                      <span class="text-[11px] text-text-secondary">Perhitungan bagi hasil IDR terekam di ledger.</span>
                    </div>
                  </div>
                  <CheckCircle2 class="h-4 w-4 text-success" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feature 2: 60/40 Creator Split (Right Text, Left Card) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-6 lg:order-2 space-y-4">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1 text-xs font-bold text-secondary">
              <TrendingUp class="h-3.5 w-3.5" />
              <span>Ekonomi Kreator Berkeadilan</span>
            </span>
            <h2 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary leading-tight">
              Kreator Mendapatkan <span class="text-secondary italic">60%</span> dari Setiap Penjualan.
            </h2>
            <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Kami percaya karya terbaik lahir saat kreator dihargai secara pantas. Tidak seperti platform konvensional yang memotong hingga 70%, Asset Market menerapkan formula 60% hak kreator dan 40% komisi operasional marketplace.
            </p>
            <div class="pt-2">
              <router-link
                to="/panduan"
                class="inline-flex items-center gap-2 rounded-2xl bg-secondary px-5 py-2.5 text-xs font-bold text-background shadow hover:bg-secondary-hover transition"
              >
                <span>Pelajari Panduan Menjual Aset</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>

          <div class="lg:col-span-6 lg:order-1">
            <div class="rounded-3xl border border-border bg-gradient-to-br from-elevated via-surface to-background p-6 sm:p-8 shadow-2xl">
              <span class="text-xs font-bold uppercase tracking-wider text-secondary block mb-3">Simulasi Pendapatan Kreator</span>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div class="rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
                  <span class="text-xs text-text-secondary block mb-1">Porsi Kreator</span>
                  <span class="font-heading text-4xl font-bold text-secondary">60%</span>
                  <span class="text-[11px] text-text-secondary block mt-1">Rp 600.000 dari Rp 1.000.000</span>
                </div>
                <div class="rounded-2xl border border-border bg-surface p-5">
                  <span class="text-xs text-text-secondary block mb-1">Platform Komisi</span>
                  <span class="font-heading text-4xl font-bold text-text-primary">40%</span>
                  <span class="text-[11px] text-text-secondary block mt-1">Hosting, Escrow, & Support</span>
                </div>
              </div>
              <div class="mt-4 rounded-2xl border border-border bg-surface/50 p-3.5 text-xs text-text-secondary flex items-center justify-between">
                <span>Pencairan dana langsung ke:</span>
                <strong class="text-text-primary">BCA, Mandiri, BNI, BRI</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- Z-PATTERN 5: DYNAMIC SHOWCASE GALLERY -->
    <!-- ========================================================================= -->
    <section class="border-t border-border bg-elevated/20 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Sparkles class="h-3.5 w-3.5" />
              <span>Etalase Pilihan Editor</span>
            </div>
            <h2 class="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
              Aset Digital Unggulan
            </h2>
          </div>

          <!-- Category filter buttons -->
          <div class="flex flex-wrap gap-2">
            <button
              @click="filterByCategory('all')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
              :class="activeCategory === 'all' ? 'bg-primary text-white font-semibold' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'"
            >
              Semua
            </button>
            <button
              @click="filterByCategory('ui_template')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
              :class="activeCategory === 'ui_template' ? 'bg-primary text-white font-semibold' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'"
            >
              UI Templates
            </button>
            <button
              @click="filterByCategory('source_code')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
              :class="activeCategory === 'source_code' ? 'bg-primary text-white font-semibold' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'"
            >
              Source Code
            </button>
            <button
              @click="filterByCategory('3d_model')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
              :class="activeCategory === '3d_model' ? 'bg-primary text-white font-semibold' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'"
            >
              3D Models
            </button>
            <button
              @click="filterByCategory('graphic')"
              class="rounded-xl px-3.5 py-1.5 text-xs font-medium transition cursor-pointer"
              :class="activeCategory === 'graphic' ? 'bg-primary text-white font-semibold' : 'bg-surface border border-border text-text-secondary hover:text-text-primary'"
            >
              Graphics
            </button>
          </div>
        </div>

        <!-- Asset Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AssetCard
            v-for="asset in assets"
            :key="asset.id"
            :asset="asset"
          />
        </div>

        <div class="mt-12 text-center">
          <router-link
            to="/explore"
            class="inline-flex items-center gap-2 rounded-2xl border border-border bg-elevated px-6 py-3 text-xs font-bold text-text-primary hover:border-primary hover:text-primary transition"
          >
            <span>Buka Seluruh Katalog Aset Digital</span>
            <ArrowRight class="h-4 w-4" />
          </router-link>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- EDITORIAL LUXURY SECTION: HOW PURCHASING WORKS -->
    <!-- ========================================================================= -->
    <section class="border-t border-border/60 py-24 lg:py-32">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <!-- Section Header -->
        <div class="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <span class="text-[11px] font-semibold uppercase tracking-[0.25em] text-text-secondary block mb-3">
            Alur Transaksi Mudah &amp; Transparan
          </span>
          <h2 class="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary">
            Bagaimana Pembelian Bekerja?
          </h2>
          <p class="mt-3 text-xs sm:text-sm text-text-secondary font-normal leading-relaxed">
            Tiga langkah sederhana, transparan, dan terverifikasi untuk memiliki aset digital impian Anda.
          </p>
        </div>

        <!-- 3-Step Refined Editorial Progression (Clean Lines, Generous Spacing, Big Numbers) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
          <!-- Step 01 -->
          <div class="border-t border-border/80 pt-8 group">
            <span class="font-heading text-5xl sm:text-6xl font-light text-text-muted/60 group-hover:text-primary transition duration-300 select-none block mb-4">
              01
            </span>
            <h3 class="text-base sm:text-lg font-bold text-text-primary tracking-tight mb-2">
              Pilih Aset &amp; Checkout
            </h3>
            <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Jelajahi kurasi aset berkualitas, periksa preview dan demo langsung, lalu selesaikan pesanan via Buy Now atau keranjang.
            </p>
          </div>

          <!-- Step 02 -->
          <div class="border-t border-border/80 pt-8 group">
            <span class="font-heading text-5xl sm:text-6xl font-light text-text-muted/60 group-hover:text-secondary transition duration-300 select-none block mb-4">
              02
            </span>
            <h3 class="text-base sm:text-lg font-bold text-text-primary tracking-tight mb-2">
              Transfer Manual &amp; Kirim Bukti
            </h3>
            <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Lakukan pembayaran ke rekening escrow resmi (BCA, Mandiri, BNI, BRI) dan unggah foto/screenshot bukti transfer.
            </p>
          </div>

          <!-- Step 03 -->
          <div class="border-t border-border/80 pt-8 group">
            <span class="font-heading text-5xl sm:text-6xl font-light text-text-muted/60 group-hover:text-success transition duration-300 select-none block mb-4">
              03
            </span>
            <h3 class="text-base sm:text-lg font-bold text-text-primary tracking-tight mb-2">
              Verifikasi &amp; Unduh Instan
            </h3>
            <p class="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Admin memverifikasi dana masuk, bagi hasil 60% langsung dicatat ke kreator, dan file arsip aktif di akun Anda selamanya.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================================= -->
    <!-- EDITORIAL FINAL CONVERSION CTA (Open, Expansive, Typography-Led) -->
    <!-- ========================================================================= -->
    <section class="relative border-t border-border/60 py-24 lg:py-36 overflow-hidden">
      <!-- Ambient Luxury Soft Glow -->
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
        <div class="h-96 w-96 rounded-full bg-primary/20 blur-3xl"></div>
      </div>

      <div class="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <!-- Subtitle -->
        <span class="text-[11px] font-semibold uppercase tracking-[0.25em] text-text-secondary block mb-4">
          Mulai Hari Ini
        </span>

        <!-- Dramatic Headline in Instrument Serif -->
        <h2 class="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-[1.08] max-w-3xl mx-auto">
          Siap Meluncurkan <span class="italic text-primary">Karya Digital</span> Impian Anda?
        </h2>

        <!-- Refined Editorial Description -->
        <p class="mt-6 text-xs sm:text-sm md:text-base text-text-secondary max-w-xl mx-auto font-normal leading-relaxed">
          Daftar sekarang untuk mulai menjual karya berlisensi dengan bagi hasil 60%, atau temukan ribuan aset premium untuk mempercepat rilis produk Anda.
        </p>

        <!-- CTA Buttons with Distinct Hierarchy -->
        <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <router-link
            to="/register"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition duration-200 cursor-pointer"
          >
            <span>Buat Akun Sekarang</span>
            <ArrowRight class="h-4 w-4" />
          </router-link>
          <router-link
            to="/panduan"
            class="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border/80 hover:border-text-secondary/60 bg-transparent hover:bg-elevated/40 px-8 py-3.5 text-xs sm:text-sm font-semibold text-text-primary hover:text-white transition duration-200 cursor-pointer"
          >
            <span>Baca Panduan Pengguna</span>
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>
