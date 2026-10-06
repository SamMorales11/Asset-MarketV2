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
  Check,
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

const ratingDisplay = computed(() => {
  return props.asset.ratingAvg ? Number(props.asset.ratingAvg).toFixed(1) : '5.0';
});

const typeLabel = computed(() => {
  return props.asset.assetType.replace('_', ' ');
});
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-elevated-card card-lift"
  >
    <!-- ═══ Thumbnail ═══ -->
    <router-link
      :to="`/assets/${asset.slug || asset.id}`"
      class="relative aspect-[4/3] w-full overflow-hidden bg-background block"
    >
      <img
        :src="formattedThumbnail"
        :alt="asset.title"
        class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        loading="lazy"
        @error="handleImageFallback($event, asset.title, asset.category?.name || asset.assetType)"
      />

      <!-- Scrim gradient on hover -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <!-- Top-left: Type badge -->
      <span
        class="absolute top-3.5 left-3.5 rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-text-primary/90 border border-white/[0.08]"
      >
        {{ typeLabel }}
      </span>

      <!-- Top-right badges -->
      <div class="absolute top-3.5 right-3.5 flex items-center gap-2">
        <!-- Discount -->
        <span
          v-if="discountPercent"
          class="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white shadow-lg shadow-primary/30"
        >
          -{{ discountPercent }}%
        </span>

        <!-- Free badge -->
        <span
          v-else-if="isFree"
          class="rounded-md bg-success px-2.5 py-1 text-[10px] font-bold text-white shadow-lg shadow-success/30"
        >
          FREE
        </span>
      </div>

      <!-- Bottom: Quick actions (on hover) -->
      <div class="absolute bottom-3.5 right-3.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
        <a
          v-if="asset.demoUrl"
          :href="asset.demoUrl"
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 backdrop-blur-md text-white/80 hover:text-white border border-white/[0.08] transition"
          title="Live Demo"
          @click.stop
        >
          <ExternalLink class="h-3.5 w-3.5" />
        </a>
      </div>
    </router-link>

    <!-- ═══ Card Body ═══ -->
    <div class="flex flex-1 flex-col px-5 pt-4 pb-5">
      <!-- Row 1: Seller + Rating -->
      <div class="flex items-center justify-between mb-2.5">
        <div class="flex items-center gap-1.5 min-w-0 max-w-[65%]">
          <div class="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-secondary/15 text-[8px] font-bold text-secondary shrink-0">
            {{ asset.seller?.name?.charAt(0).toUpperCase() || 'C' }}
          </div>
          <span class="truncate text-[11px] font-medium text-text-muted">
            {{ asset.seller?.name || 'Verified Creator' }}
          </span>
          <CheckCircle2
            v-if="asset.seller?.isVerifiedSeller"
            class="h-3 w-3 text-secondary shrink-0"
          />
        </div>

        <div class="flex items-center gap-1 text-[11px] shrink-0">
          <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
          <span class="font-semibold text-text-primary tabular-nums">{{ ratingDisplay }}</span>
          <span class="text-text-muted">({{ asset.ratingCount || 0 }})</span>
        </div>
      </div>

      <!-- Row 2: Title -->
      <router-link
        :to="`/assets/${asset.slug || asset.id}`"
        class="font-heading text-lg leading-snug font-bold text-text-primary group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-1.5"
      >
        {{ asset.title }}
      </router-link>

      <!-- Row 3: Description -->
      <p class="text-[12px] text-text-muted line-clamp-2 leading-relaxed flex-1 mb-3">
        {{ asset.shortDescription || asset.description }}
      </p>

      <!-- Row 4: Tags -->
      <div v-if="asset.tags && asset.tags.length > 0" class="flex flex-wrap gap-1.5 mb-4">
        <span
          v-for="tag in asset.tags.slice(0, 3)"
          :key="tag"
          class="rounded bg-background px-2 py-0.5 text-[10px] text-text-muted/80 border border-border/40"
        >
          {{ tag }}
        </span>
        <span
          v-if="asset.tags.length > 3"
          class="rounded bg-background px-2 py-0.5 text-[10px] text-text-muted/60"
        >
          +{{ asset.tags.length - 3 }}
        </span>
      </div>

      <!-- ═══ Price & Action Footer ═══ -->
      <div class="flex items-end justify-between border-t border-border/40 pt-4 mt-auto">
        <div>
          <div class="text-[9px] uppercase tracking-[0.12em] text-text-muted/70 mb-1 font-medium">Price</div>
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-[17px] font-bold font-mono tracking-tight"
              :class="isFree ? 'text-success' : 'text-text-primary'"
            >
              {{ formattedPrice }}
            </span>
            <span
              v-if="formattedOriginalPrice"
              class="text-[11px] text-text-muted/60 line-through font-mono"
            >
              {{ formattedOriginalPrice }}
            </span>
          </div>
        </div>

        <button
          class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[11px] font-semibold transition-all duration-200 active:scale-95"
          :class="
            isInCart
              ? 'bg-success/10 text-success border border-success/25'
              : 'bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:bg-primary-hover'
          "
          @click.stop="cartStore.addItem(asset)"
        >
          <Check v-if="isInCart" class="h-3.5 w-3.5" />
          <ShoppingBag v-else class="h-3.5 w-3.5" />
          <span>{{ isInCart ? 'In Cart' : 'Add' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
