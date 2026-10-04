<script setup lang="ts">
import Skeleton from './Skeleton.vue';

interface Props {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

withDefaults(defineProps<Props>(), {
  columns: 5,
  rows: 5,
  showHeader: true,
});
</script>

<template>
  <div class="overflow-hidden rounded-3xl border border-border/50 bg-elevated/70 shadow-2xl backdrop-blur-md">
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse text-xs">
        <thead v-if="showHeader">
          <tr class="border-b border-border/60 bg-elevated-subtle/50">
            <th v-for="c in columns" :key="'th-' + c" class="py-4 px-5">
              <Skeleton variant="text" width="w-20" height="h-3" rounded="rounded" />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/40">
          <tr v-for="r in rows" :key="'tr-' + r" class="bg-transparent">
            <td v-for="c in columns" :key="'td-' + r + '-' + c" class="py-4 px-5">
              <div class="space-y-1.5">
                <Skeleton
                  variant="text"
                  :width="c === 1 ? 'w-32' : c === 2 ? 'w-24' : c === columns ? 'w-16' : 'w-28'"
                  height="h-3.5"
                  rounded="rounded"
                />
                <Skeleton
                  v-if="c === 1 || c === 3"
                  variant="text"
                  width="w-20"
                  height="h-2.5"
                  rounded="rounded"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
