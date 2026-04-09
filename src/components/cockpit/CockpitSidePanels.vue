<script setup lang="ts">
// 左右看板容器：负责布局和遍历
import CockpitPanelCard from '@/components/cockpit/CockpitPanelCard.vue'

defineProps<{
  leftPanels: Array<{ id: string; title: string; dim?: boolean }>
  rightPanels: Array<{ id: string; title: string; dim?: boolean }>
}>()
</script>

<template>
  <div class="cockpit-overlay">
    <!-- 左侧看板 -->
    <aside class="cockpit-overlay__aside cockpit-overlay__aside--left">
      <CockpitPanelCard v-for="panel in leftPanels" :key="panel.id" :title="panel.title" :dim="panel.dim">
        <slot :name="panel.id" :panel="panel" />
      </CockpitPanelCard>
    </aside>
    <!-- 右侧看板 -->
    <aside class="cockpit-overlay__aside cockpit-overlay__aside--right">
      <CockpitPanelCard v-for="panel in rightPanels" :key="panel.id" :title="panel.title" :dim="panel.dim">
        <slot :name="panel.id" :panel="panel" />
      </CockpitPanelCard>
    </aside>
    <!-- 预留插槽 -->
    <slot />
  </div>
</template>

<style scoped>
.cockpit-overlay { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.cockpit-overlay__aside { position: absolute; display: flex; flex-direction: column; gap: 12px; width: 380px; top: 16px; bottom: 120px; pointer-events: all; }
.cockpit-overlay__aside--left { left: 16px; }
.cockpit-overlay__aside--right { right: 16px; }
</style>

