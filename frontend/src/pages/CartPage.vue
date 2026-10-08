<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback } from '../utils/imageUrl';
import EmptyState from '../components/EmptyState.vue';
import Skeleton from '../components/Skeleton.vue';
import { useConfirm } from '../composables/useConfirm';
import {
  Trash2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Zap,
  AlertCircle,
} from 'lucide-vue-next';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();
const { confirm } = useConfirm();

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await cartStore.fetchCart();
  }
});

function handleProceedToCheckout() {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: '/checkout' } });
    return;
  }
  router.push('/checkout');
}

function handleRemoveItem(itemId: string) {
  cartStore.removeItem(itemId);
}

async function handleClearCart() {
  const confirmed = await confirm({
    title: 'Kosongkan Keranjang Belanja?',
    message: 'Apakah Anda yakin ingin menghapus seluruh aset digital dari keranjang belanja Anda?',
    confirmText: 'Ya, Kosongkan Keranjang',
    cancelText: 'Batal',
    variant: 'danger',
  });
  if (confirmed) {
    await cartStore.clearCart();
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="mb-6 flex items-center gap-2 text-xs text-text-secondary">
      <router-link to="/" class="hover:text-text-primary transition">Home</router-link>
      <span>/</span>
      <span class="text-text-primary font-medium">Cart</span>
    </nav>

    <!-- Header -->
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <h1 class="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-text-primary">
            Shopping Cart
          </h1>
          <span
            v-if="cartStore.itemCount > 0"
            class="rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 font-mono text-xs font-bold text-primary"
          >
            {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}
          </span>
        </div>
        <p class="text-xs text-text-secondary">
          Curated digital assets ready for instant commercial licensing.
        </p>
      </div>

      <!-- Quick Action: Clear Cart -->
      <button
        v-if="cartStore.itemCount > 0"
        class="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-red-400 transition"
        @click="handleClearCart"
      >
        <Trash2 class="h-3.5 w-3.5" />
        <span>Clear All</span>
      </button>
    </div>

    <!-- ERROR STATE WITH RETRY -->
    <div
      v-if="cartStore.error && !cartStore.isLoading"
      class="mb-6 flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-medium text-red-400 backdrop-blur-md"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="h-4 w-4 shrink-0 text-red-400" />
        <span>{{ cartStore.error }}</span>
      </div>
      <button
        class="rounded-lg bg-red-500/20 px-3 py-1 font-semibold text-red-300 hover:bg-red-500/30 transition cursor-pointer"
        @click="cartStore.fetchCart"
      >
        Coba Muat Ulang
      </button>
    </div>

    <!-- LOADING SKELETON (2-Column Grid matching Cart layout) -->
    <div v-if="cartStore.isLoading" class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column: Item List Skeletons -->
      <div class="lg:col-span-8 space-y-4">
        <div
          v-for="n in 3"
          :key="n"
          class="rounded-3xl border border-border/50 bg-elevated/70 p-5 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-xl"
        >
          <!-- Thumbnail Skeleton -->
          <Skeleton variant="card" width="w-full sm:w-36" height="h-24" rounded="rounded-2xl" />
          <!-- Metadata & Title Skeleton -->
          <div class="flex-1 space-y-2 w-full">
            <Skeleton variant="text" width="w-32" height="h-3" rounded="rounded" />
            <Skeleton variant="title" width="w-3/4" height="h-5" rounded="rounded-md" />
            <Skeleton variant="text" width="w-24" height="h-3" rounded="rounded" />
          </div>
          <!-- Price Skeleton -->
          <div class="sm:text-right space-y-2 w-full sm:w-28 flex sm:flex-col justify-between items-center sm:items-end">
            <Skeleton variant="title" width="w-24" height="h-6" rounded="rounded-md" />
            <Skeleton variant="button" width="w-16" height="h-6" rounded="rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Right Column: Order Summary Skeleton -->
      <div class="lg:col-span-4 rounded-3xl border border-border/50 bg-elevated/70 p-6 backdrop-blur-md space-y-6 shadow-xl">
        <Skeleton variant="title" width="w-40" height="h-6" rounded="rounded-lg" />
        <div class="space-y-3">
          <div class="flex justify-between">
            <Skeleton variant="text" width="w-24" height="h-4" rounded="rounded" />
            <Skeleton variant="text" width="w-20" height="h-4" rounded="rounded" />
          </div>
          <div class="flex justify-between">
            <Skeleton variant="text" width="w-20" height="h-4" rounded="rounded" />
            <Skeleton variant="text" width="w-16" height="h-4" rounded="rounded" />
          </div>
          <div class="pt-3 border-t border-border/40 flex justify-between">
            <Skeleton variant="text" width="w-28" height="h-5" rounded="rounded" />
            <Skeleton variant="title" width="w-24" height="h-6" rounded="rounded-md" />
          </div>
        </div>
        <Skeleton variant="button" width="w-full" height="h-12" rounded="rounded-2xl" />
      </div>
    </div>

    <!-- EMPTY STATE -->
    <EmptyState
      v-else-if="cartStore.itemCount === 0"
      icon="cart"
      icon-color="primary"
      title="Keranjang Belanja Anda Kosong"
      description="Anda belum menambahkan aset digital ke keranjang belanja. Jelajahi ribuan UI template, source code, model 3D, dan grafis berkualitas tinggi siap pakai."
      action-text="Jelajahi Katalog Aset"
      action-to="/explore"
      :action-icon="Sparkles"
    />

    <!-- CART WITH ITEMS (2-Column Grid) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column: Item List (8 Cols) -->
      <div class="lg:col-span-8 space-y-4">
        <div
          v-for="item in cartStore.items"
          :key="item.id"
          class="group overflow-hidden rounded-3xl border border-border bg-elevated/80 p-5 backdrop-blur-md transition hover:border-border-hover"
        >
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <!-- Thumbnail Cover -->
            <router-link
              :to="`/assets/${item.asset.slug || item.asset.id}`"
              class="relative aspect-video w-full sm:w-36 shrink-0 overflow-hidden rounded-2xl border border-border bg-background"
            >
              <img
                :src="getAssetImageUrl(item.asset.thumbnailUrl)"
                :alt="item.asset.title"
                class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                @error="handleImageFallback($event, item.asset.title, item.asset.assetType)"
              />
              <span
                class="absolute bottom-1.5 left-1.5 rounded bg-background/80 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-secondary"
              >
                {{ item.asset.assetType?.replace('_', ' ') }}
              </span>
            </router-link>

            <!-- Metadata & Title -->
            <div class="flex-1 min-w-0 space-y-1.5">
              <div class="flex items-center gap-2 text-[11px] text-text-secondary">
                <span>{{ item.asset.category?.name || 'General' }}</span>
                <span>•</span>
                <span class="flex items-center gap-1">
                  By {{ item.asset.seller?.name || 'Creator' }}
                  <CheckCircle2
                    v-if="item.asset.seller?.isVerifiedSeller"
                    class="h-3 w-3 text-secondary"
                  />
                </span>
              </div>

              <router-link
                :to="`/assets/${item.asset.slug || item.asset.id}`"
                class="block font-heading text-xl font-bold text-text-primary hover:text-primary transition truncate"
              >
                {{ item.asset.title }}
              </router-link>

              <p class="text-xs text-text-secondary line-clamp-1">
                {{ item.asset.shortDescription || item.asset.description }}
              </p>

              <div class="flex items-center gap-2 text-[11px] text-success pt-1">
                <Zap class="h-3 w-3" />
                <span>Commercial Standard License Included</span>
              </div>
            </div>

            <!-- Price & Remove Action -->
            <div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
              <div class="text-left sm:text-right">
                <div class="font-mono text-lg font-bold text-text-primary">
                  {{ formatCurrency(item.asset.discountPrice ?? item.asset.price) }}
                </div>
                <div
                  v-if="item.asset.discountPrice"
                  class="font-mono text-xs text-text-secondary line-through"
                >
                  {{ formatCurrency(item.asset.price) }}
                </div>
              </div>

              <button
                class="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-text-secondary hover:border-red-500/50 hover:text-red-400 transition"
                title="Remove item"
                @click="handleRemoveItem(item.id)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- 60/40 Transparent Monetization Note -->
        <div class="rounded-3xl border border-secondary/20 bg-secondary/5 p-5 flex items-start gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
            <ShieldCheck class="h-5 w-5" />
          </div>
          <div class="text-xs text-text-secondary leading-relaxed">
            <strong class="text-text-primary font-semibold">Empowering Creators (60/40 Split):</strong>
            60% of every purchase goes directly into the verified seller's bank account upon manual transfer verification.
            Platform maintenance fee is completely free for you as a buyer.
          </div>
        </div>
      </div>

      <!-- Right Column: Sticky Order Summary (4 Cols) -->
      <aside class="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
        <div class="overflow-hidden rounded-3xl border border-border bg-elevated/90 p-6 shadow-2xl backdrop-blur-xl space-y-6">
          <h3 class="font-heading text-2xl font-bold text-text-primary border-b border-border pb-4">
            Order Summary
          </h3>

          <!-- Price Calculation -->
          <div class="space-y-3 text-xs">
            <div class="flex justify-between text-text-secondary">
              <span>Items Subtotal ({{ cartStore.itemCount }})</span>
              <span class="font-mono text-text-primary font-medium">
                {{ formatCurrency(cartStore.subtotal) }}
              </span>
            </div>

            <div class="flex justify-between text-text-secondary">
              <span>Buyer Platform Fee</span>
              <span class="font-mono text-success font-medium">Rp 0 (Free)</span>
            </div>

            <div class="flex justify-between text-text-secondary">
              <span>Payment Method</span>
              <span class="text-text-primary font-medium">Manual Bank Transfer</span>
            </div>

            <div class="border-t border-border pt-4 flex items-baseline justify-between">
              <span class="text-sm font-bold text-text-primary">Total Investment</span>
              <span class="font-mono text-2xl font-bold text-primary">
                {{ formatCurrency(cartStore.totalAmount) }}
              </span>
            </div>
          </div>

          <!-- PRIMARY CTA BUTTON with #D93A0F -->
          <button
            class="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-xs font-semibold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover transition transform active:scale-[0.98]"
            @click="handleProceedToCheckout"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight class="h-4 w-4" />
          </button>

          <!-- Security Guarantees -->
          <div class="space-y-2.5 pt-2 border-t border-border text-[11px] text-text-secondary">
            <div class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
              <span>Instant download delivery after payment verification</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
              <span>Secure escrow payment through verified accounts</span>
            </div>
            <div class="flex items-center gap-2">
              <CheckCircle2 class="h-4 w-4 text-success shrink-0" />
              <span>Commercial rights & lifetime updates included</span>
            </div>
          </div>
        </div>

        <!-- Back to Catalog Link -->
        <router-link
          to="/explore"
          class="flex items-center justify-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          <span>Continue Browsing Assets</span>
        </router-link>
      </aside>
    </div>
  </div>
</template>
