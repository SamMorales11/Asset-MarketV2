<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'text' | 'title' | 'avatar' | 'rect' | 'button' | 'badge' | 'card';
  width?: string;
  height?: string;
  rounded?: string;
  animate?: 'shimmer' | 'pulse' | 'none';
  customClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'text',
  width: '',
  height: '',
  rounded: '',
  animate: 'pulse',
  customClass: '',
});

const defaultClasses = computed(() => {
  const classes: string[] = [];

  // Animation style
  if (props.animate === 'pulse') {
    classes.push('skeleton-pulse');
  } else if (props.animate === 'shimmer') {
    classes.push('skeleton-shimmer');
  } else {
    classes.push('bg-elevated-subtle');
  }

  // Variant default sizing & radius
  switch (props.variant) {
    case 'text':
      classes.push(props.height || 'h-3.5');
      classes.push(props.width || 'w-full');
      classes.push(props.rounded || 'rounded-md');
      break;
    case 'title':
      classes.push(props.height || 'h-7');
      classes.push(props.width || 'w-3/4');
      classes.push(props.rounded || 'rounded-lg');
      break;
    case 'avatar':
      classes.push(props.height || 'h-10');
      classes.push(props.width || 'w-10');
      classes.push(props.rounded || 'rounded-full');
      classes.push('shrink-0');
      break;
    case 'button':
      classes.push(props.height || 'h-10');
      classes.push(props.width || 'w-28');
      classes.push(props.rounded || 'rounded-xl');
      break;
    case 'badge':
      classes.push(props.height || 'h-5');
      classes.push(props.width || 'w-16');
      classes.push(props.rounded || 'rounded-full');
      break;
    case 'card':
      classes.push(props.height || 'h-48');
      classes.push(props.width || 'w-full');
      classes.push(props.rounded || 'rounded-2xl');
      break;
    case 'rect':
    default:
      classes.push(props.height || 'h-24');
      classes.push(props.width || 'w-full');
      classes.push(props.rounded || 'rounded-xl');
      break;
  }

  if (props.customClass) {
    classes.push(props.customClass);
  }

  return classes.join(' ');
});
</script>

<template>
  <div :class="defaultClasses" aria-hidden="true"></div>
</template>
