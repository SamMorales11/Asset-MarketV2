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

const formattedPrice = computed(() =>
  formatCurrency(props.asset.discountPrice ?? props.asset.price)
);

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
</script>

<template>
  <div
    class="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-elevated/90 transition-all duration-300 hover:border-border-hover hover:shadow-2xl hover:shadow-primary/5 backdrop-blur-sm"
  >
    <!-- Thumbnail Media with Hover Zoom Effect -->
    <router-link
      :to="`/assets/${asset.slug || asset.id}`"
      class="relative aspect-video w-full overflow-hidden bg-elevated-subtle block"
    >
      <img
        :src="formattedThumbnail"
        :alt="asset.title"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        @error="handleImageFallback($event, asset.title, asset.category?.name || asset.assetType)"
      />
      <!-- Type Badge -->
      <span
        class="absolute top-3 left-3 rounded-md bg-background/85 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-primary border border-border/80 shadow-sm"
      >
        {{ asset.assetType.replace('_', ' ') }}
      </span>

      <!-- Discount Tag if Available -->
      <span
        v-if="asset.discountPrice"
        class="absolute top-3 right-3 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow"
      >
        PROMO
      </span>
    </router-link>

    <!-- Card Content -->
    <div class="flex flex-1 flex-col p-5">
      <!-- Seller & Rating Row -->
      <div class="flex items-center justify-between text-xs text-text-secondary mb-2.5">
        <div class="flex items-center gap-1.5 truncate max-w-[170px]">
          <div
            v-if="asset.seller?.avatarUrl"
            class="h-4 w-4 rounded-full overflow-hidden shrink-0 border border-border"
          >
            <img :src="asset.seller.avatarUrl" :alt="asset.seller.name" class="h-full w-full object-cover" />
          </div>
          <span class="truncate font-medium text-text-secondary hover:text-text-primary transition">
            {{ asset.seller?.name || 'Verified Creator' }}
          </span>
          <CheckCircle2
            v-if="asset.seller?.isVerifiedSeller"
            class="h-3 w-3 text-secondary shrink-0"
            title="Verified Seller"
          />
        </div>

        <div class="flex items-center gap-1 font-semibold text-text-primary shrink-0">
          <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{{ asset.ratingAvg ? Number(asset.ratingAvg).toFixed(1) : '5.0' }}</span>
          <span class="text-text-secondary text-[11px] font-normal">({{ asset.ratingCount || 0 }})</span>
        </div>
      </div>

      <!-- Title in Instrument Serif Heading -->
      <router-link
        :to="`/assets/${asset.slug || asset.id}`"
        class="font-heading text-xl font-bold text-text-primary group-hover:text-primary transition line-clamp-1"
      >
        {{ asset.title }}
      </router-link>

      <!-- Short Tagline Description -->
      <p class="mt-2 text-xs text-text-secondary line-clamp-2 leading-relaxed flex-1">
        {{ asset.shortDescription || asset.description }}
      </p>

      <!-- Tags Pills -->
      <div class="mt-3.5 flex flex-wrap gap-1.5">
        <span
          v-for="tag in (asset.tags || []).slice(0, 3)"
          :key="tag"
          class="rounded bg-background px-2 py-0.5 text-[10px] text-text-secondary border border-border"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Price & Action Footer -->
      <div class="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-text-secondary">Price</div>
          <div class="flex items-baseline gap-2">
            <span class="text-base font-bold text-text-primary font-mono">
              {{ formattedPrice }}
            </span>
            <span
              v-if="formattedOriginalPrice"
              class="text-xs text-text-secondary line-through font-mono"
            >
              {{ formattedOriginalPrice }}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            v-if="asset.demoUrl"
            :href="asset.demoUrl"
            target="_blank"
            rel="noreferrer"
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-text-secondary hover:text-text-primary hover:border-border-hover transition"
            title="Live Demo"
          >
            <ExternalLink class="h-3.5 w-3.5" />
          </a>

          <button
            class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition"
            :class="
              isInCart
                ? 'bg-success/15 text-success border border-success/30'
                : 'bg-primary text-white shadow-sm hover:bg-primary-hover'
            "
            @click.stop="cartStore.addItem(asset)"
          >
            <ShoppingBag class="h-3.5 w-3.5" />
            <span>{{ isInCart ? 'In Cart' : 'Add' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
