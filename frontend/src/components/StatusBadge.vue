<script setup lang="ts">
import { computed } from 'vue';
import type { AssetStatus } from '../types';
import { Clock, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    status: AssetStatus;
    showIcon?: boolean;
    showHelper?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    showIcon: true,
    showHelper: false,
    size: 'sm',
  }
);

const config = computed(() => {
  switch (props.status) {
    case 'approved':
      return {
        label: 'Approved & Live',
        subLabel: 'Aktif di Katalog Publik',
        badgeClass: 'bg-success/15 text-success border-success/40 shadow-sm shadow-success/10',
        dotClass: 'bg-success shadow-[0_0_8px_rgba(10,191,110,0.6)]',
        pulse: false,
        icon: CheckCircle2,
      };
    case 'rejected':
      return {
        label: 'Perlu Revisi',
        subLabel: 'Ditolak oleh Kurator',
        badgeClass: 'bg-primary/15 text-primary border-primary/40 shadow-sm shadow-primary/10',
        dotClass: 'bg-primary shadow-[0_0_8px_rgba(217,58,15,0.6)]',
        pulse: false,
        icon: AlertOctagon,
      };
    case 'pending':
    default:
      return {
        label: 'Menunggu Review',
        subLabel: 'Estimasi moderasi 1-24 jam',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10',
        dotClass: 'bg-amber-400',
        pulse: true,
        icon: Clock,
      };
  }
});
</script>

<template>
  <div class="inline-flex flex-col items-start gap-1">
    <span
      class="inline-flex items-center gap-1.5 rounded-full border font-medium transition backdrop-blur-md"
      :class="[
        config.badgeClass,
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : size === 'md' ? 'px-3 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
      ]"
      :title="config.subLabel"
    >
      <!-- Pulsing status dot indicator -->
      <span class="relative flex h-2 w-2">
        <span
          v-if="config.pulse"
          class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          :class="config.dotClass"
        />
        <span class="relative inline-flex rounded-full h-2 w-2" :class="config.dotClass" />
      </span>

      <!-- Icon -->
      <component :is="config.icon" v-if="showIcon" class="h-3 w-3 shrink-0" />

      <!-- Label -->
      <span class="font-semibold">{{ config.label }}</span>
    </span>

    <!-- Optional Informative Helper Text -->
    <span
      v-if="showHelper"
      class="text-[10px] text-text-secondary flex items-center gap-1 pl-1"
    >
      <HelpCircle class="h-2.5 w-2.5 opacity-70" />
      <span>{{ config.subLabel }}</span>
    </span>
  </div>
</template>
