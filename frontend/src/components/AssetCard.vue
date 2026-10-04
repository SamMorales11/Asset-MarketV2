<script setup lang="ts">
import { computed } from 'vue';
import { useCartStore } from '../stores/cart';
import { formatCurrency } from '../utils/formatters';
import { getAssetImageUrl, handleImageFallback, getLuxuryPlaceholder } from '../utils/imageUrl';
import type { Asset } from '../types';
import {
  Star,
  CheckCircle2,
  ShoppingBag,
  ExternalLink,
} from 'lucide-vue-next';

const props = defineProps<{
  asset: Asset;
}>();

const cartStore = useCartStore();

const isInCart = computed(() => cartStore.hasItem(props.asset.id));

const isFree = computed(() => {
  const effectivePrice =
    props.asset.discountPrice !== null && props.asset.discountPrice !== undefined
      ? Number(props.asset.discountPrice)
      : Number(props.asset.price);
  return effectivePrice === 0;
});

const formattedPrice = computed(() => {
  if (isFree.value) return 'FREE';
  return formatCurrency(props.asset.discountPrice ?? props.asset.price);
});

const formattedOriginalPrice = computed(() =>
  props.asset.discountPrice ? formatCurrency(props.asset.price) : null
);

const formattedThumbnail = computed(() => {
  const rawUrl =
    props.asset.thumbnailUrl ||
    (props.asset as any).thumbnail ||
    (props.asset as any).thumbnail_url ||
    (props.asset as any).coverUrl ||
    (props.asset as any).cover_url ||
    (props.asset as any).imageUrl ||
    (props.asset as any).image_url;
  if (!rawUrl) {
    return getLuxuryPlaceholder(props.asset.title, props.asset.category?.name || props.asset.assetType);
  }
  return getAssetImageUrl(rawUrl);
});

const discountPercent = computed(() => {
  if (!props.asset.discountPrice || !props.asset.price) return null;
  const original = Number(props.asset.price);
  const discounted = Number(props.asset.discountPrice);
  if (original <= 0 || discounted >= original) return null;
  return Math.round(((original - discounted) / original) * 100);
});
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-elevated-card card-lift"
  >
    <!-- Thumbnail Media -->
    <router-link
      :to="`/assets/${asset.slug || asset.id}`"
      class="relative aspect-[16/10] w-full overflow-hidden bg-background block"
    >
      <img
        :src="formattedThumbnail"
        :alt="asset.title"
        class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        loading="lazy"
        @error="handleImageFallback($event, asset.title, asset.category?.name || asset.assetType)"
      />

      <!-- Gradient overlay on hover -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <!-- Type Badge -->
      <span
        class="absolute top-3 left-3 rounded-md bg-background/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-text-primary border border-border/50"
      >
        {{ asset.assetType.replace('_', ' ') }}
      </span>

      <!-- Discount Badge -->
      <span
        v-if="discountPercent"
        class="absolute top-3 right-3 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white shadow-lg shadow-primary/30"
      >
        -{{ discountPercent }}%
      </span>

      <!-- Free Badge -->
      <span
        v-else-if="isFree"
        class="absolute top-3 right-3 rounded-md bg-success px-2.5 py-1 text-[10px] font-bold text-white shadow-lg shadow-success/30"
      >
        FREE
      </span>

      <!-- Quick actions on hover -->
      <div class="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        <a
          v-if="asset.demoUrl"
          :href="asset.demoUrl"
          target="_blank"
          rel="noreferrer"
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm text-text-secondary hover:text-text-primary border border-border/50 transition"
          title="Live Demo"
          @click.stop
        >
          <ExternalLink class="h-3.5 w-3.5" />
        </a>
      </div>
    </router-link>

    <!-- Card Body -->
    <div class="flex flex-1 flex-col p-5">
      <!-- Seller Row -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-1.5 truncate max-w-[65%]">
          <div class="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/15 text-[9px] font-bold text-secondary shrink-0">
            {{ asset.seller?.name?.charAt(0).toUpperCase() || 'C' }}
          </div>
          <span class="truncate text-[11px] font-medium text-text-secondary">
            {{ asset.seller?.name || 'Verified Creator' }}
          </span>
          <CheckCircle2
            v-if="asset.seller?.isVerifiedSeller"
            class="h-3 w-3 text-secondary shrink-0"
          />
        </div>

        <div class="flex items-center gap-1 text-[11px] shrink-0">
          <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
          <span class="font-semibold text-text-primary">{{ asset.ratingAvg ? Number(asset.ratingAvg).toFixed(1) : '5.0' }}</span>
          <span class="text-text-muted">({{ asset.ratingCount || 0 }})</span>
        </div>
      </div>

      <!-- Title -->
      <router-link
        :to="`/assets/${asset.slug || asset.id}`"
        class="font-heading text-[1.25rem] leading-tight font-bold text-text-primary group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-2"
      >
        {{ asset.title }}
      </router-link>

      <!-- Short Description -->
      <p class="text-[12px] text-text-secondary/80 line-clamp-2 leading-relaxed flex-1 mb-4">
        {{ asset.shortDescription || asset.description }}
      </p>

      <!-- Tags -->
      <div v-if="asset.tags && asset.tags.length > 0" class="flex flex-wrap gap-1.5 mb-4">
        <span
          v-for="tag in asset.tags.slice(0, 3)"
          :key="tag"
          class="rounded-md bg-background/80 px-2 py-0.5 text-[10px] text-text-muted border border-border/50"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Price & Action Footer -->
      <div class="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
        <div>
          <div class="text-[9px] uppercase tracking-[0.1em] text-text-muted mb-0.5">Price</div>
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-lg font-bold font-mono"
              :class="isFree ? 'text-success' : 'text-text-primary'"
            >
              {{ formattedPrice }}
            </span>
            <span
              v-if="formattedOriginalPrice"
              class="text-[11px] text-text-muted line-through font-mono"
            >
              {{ formattedOriginalPrice }}
            </span>
          </div>
        </div>

        <button
          class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-semibold transition-all duration-200 active:scale-95"
          :class="
            isInCart
              ? 'bg-success/12 text-success border border-success/25'
              : 'bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary-hover'
          "
          @click.stop="cartStore.addItem(asset)"
        >
          <ShoppingBag class="h-3.5 w-3.5" />
          <span>{{ isInCart ? 'In Cart' : 'Add' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
