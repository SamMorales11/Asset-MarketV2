<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
  FolderOpen,
  FolderArchive,
  ShoppingBag,
  Receipt,
  ShieldCheck,
  Search,
  Sparkles,
  Package,
  Layers,
  Inbox,
} from 'lucide-vue-next';

interface Props {
  icon?: string | Component;
  iconColor?: 'primary' | 'secondary' | 'success' | 'amber' | 'muted';
  title: string;
  description?: string;
  actionText?: string;
  actionTo?: string | Record<string, any>;
  actionIcon?: Component;
  actionVariant?: 'primary' | 'secondary' | 'outline' | 'white';
  secondaryActionText?: string;
  secondaryActionTo?: string | Record<string, any>;
  secondaryActionIcon?: Component;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'folder',
  iconColor: 'secondary',
  description: '',
  actionText: '',
  actionTo: undefined,
  actionIcon: undefined,
  actionVariant: 'primary',
  secondaryActionText: '',
  secondaryActionTo: undefined,
  secondaryActionIcon: undefined,
  compact: false,
});

const emit = defineEmits<{
  (e: 'action'): void;
  (e: 'secondaryAction'): void;
}>();

// Map string icon names to standard Lucide icons
const resolvedIcon = computed(() => {
  if (typeof props.icon !== 'string') {
    return props.icon;
  }
  switch (props.icon) {
    case 'cart':
    case 'shopping-bag':
      return ShoppingBag;
    case 'receipt':
    case 'invoice':
      return Receipt;
    case 'shield-check':
    case 'approval':
    case 'check':
      return ShieldCheck;
    case 'search':
      return Search;
    case 'package':
    case 'assets':
      return Package;
    case 'layers':
      return Layers;
    case 'library':
    case 'my-assets':
      return FolderArchive;
    case 'sparkles':
      return Sparkles;
    case 'inbox':
      return Inbox;
    case 'folder':
    default:
      return FolderOpen;
  }
});

const colorClasses = computed(() => {
  switch (props.iconColor) {
    case 'primary':
      return {
        glow: 'from-primary/20 via-primary/5 to-transparent',
        badgeBg: 'bg-primary/10 border-primary/30 text-primary',
        subtleRing: 'border-primary/20',
      };
    case 'success':
      return {
        glow: 'from-success/20 via-success/5 to-transparent',
        badgeBg: 'bg-success/10 border-success/30 text-success',
        subtleRing: 'border-success/20',
      };
    case 'amber':
      return {
        glow: 'from-amber-500/20 via-amber-500/5 to-transparent',
        badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        subtleRing: 'border-amber-500/20',
      };
    case 'muted':
      return {
        glow: 'from-white/10 via-white/5 to-transparent',
        badgeBg: 'bg-elevated border-border text-text-muted',
        subtleRing: 'border-border/40',
      };
    case 'secondary':
    default:
      return {
        glow: 'from-secondary/20 via-secondary/5 to-transparent',
        badgeBg: 'bg-secondary/10 border-secondary/30 text-secondary',
        subtleRing: 'border-secondary/20',
      };
  }
});

const actionButtonClass = computed(() => {
  switch (props.actionVariant) {
    case 'secondary':
      return 'bg-secondary text-background hover:bg-secondary-hover shadow-lg shadow-secondary/20';
    case 'outline':
      return 'border border-border/70 bg-elevated/80 text-text-primary hover:border-secondary hover:text-secondary';
    case 'white':
      return 'bg-text-primary text-background hover:opacity-90 shadow-lg';
    case 'primary':
    default:
      return 'bg-primary text-white hover:bg-primary-hover shadow-xl shadow-primary/25';
  }
});

function handleActionClick() {
  emit('action');
}

function handleSecondaryClick() {
  emit('secondaryAction');
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-b from-elevated/70 via-elevated/40 to-elevated-card/70 text-center backdrop-blur-md transition-all duration-300"
    :class="compact ? 'p-8 sm:p-10' : 'p-12 sm:p-20'"
  >
    <!-- Background Ambient Glow -->
    <div
      class="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-gradient-to-b blur-3xl opacity-60"
      :class="colorClasses.glow"
    ></div>

    <!-- Multi-layered Concentric Icon Badge -->
    <div class="relative mx-auto mb-6 inline-flex items-center justify-center">
      <!-- Outer subtle ripple ring -->
      <div
        class="absolute -inset-3 rounded-[2rem] border border-dashed opacity-40 animate-[spin_24s_linear_infinite]"
        :class="colorClasses.subtleRing"
      ></div>

      <!-- Main Badge Container -->
      <div
        class="relative flex items-center justify-center rounded-3xl border shadow-2xl backdrop-blur-xl transition duration-300 group-hover:scale-105"
        :class="[
          compact ? 'h-16 w-16' : 'h-20 w-20',
          colorClasses.badgeBg
        ]"
      >
        <slot name="icon">
          <component
            :is="resolvedIcon"
            :class="compact ? 'h-7 w-7' : 'h-9 w-9'"
            stroke-width="1.8"
          />
        </slot>
      </div>
    </div>

    <!-- Title & Description -->
    <div class="relative z-10 max-w-lg mx-auto space-y-2">
      <h3
        class="font-heading font-bold text-text-primary tracking-tight"
        :class="compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl lg:text-4xl'"
      >
        <slot name="title">{{ title }}</slot>
      </h3>

      <p
        v-if="description || $slots.description"
        class="text-text-secondary leading-relaxed mx-auto"
        :class="compact ? 'text-xs max-w-sm' : 'text-xs sm:text-sm max-w-md'"
      >
        <slot name="description">{{ description }}</slot>
      </p>
    </div>

    <!-- Extra Slot (e.g. Filters / Badges) -->
    <div v-if="$slots.extra" class="relative z-10 mt-4">
      <slot name="extra"></slot>
    </div>

    <!-- CTA Actions -->
    <div
      v-if="actionText || secondaryActionText || $slots.actions"
      class="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3"
    >
      <slot name="actions">
        <!-- Primary Action -->
        <component
          :is="actionTo ? 'router-link' : 'button'"
          v-if="actionText"
          :to="actionTo"
          class="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold transition transform active:scale-95 cursor-pointer"
          :class="actionButtonClass"
          @click="!actionTo && handleActionClick()"
        >
          <component :is="actionIcon" v-if="actionIcon" class="h-4 w-4" />
          <span>{{ actionText }}</span>
        </component>

        <!-- Secondary Action -->
        <component
          :is="secondaryActionTo ? 'router-link' : 'button'"
          v-if="secondaryActionText"
          :to="secondaryActionTo"
          class="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-elevated/70 px-5 py-3 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-border-hover transition transform active:scale-95 cursor-pointer"
          @click="!secondaryActionTo && handleSecondaryClick()"
        >
          <component :is="secondaryActionIcon" v-if="secondaryActionIcon" class="h-3.5 w-3.5" />
          <span>{{ secondaryActionText }}</span>
        </component>
      </slot>
    </div>
  </div>
</template>
