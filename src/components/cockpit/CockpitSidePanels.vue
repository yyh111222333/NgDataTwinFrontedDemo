<!-- 侧边看板容器：左右各三列，与中间场景区并列。 -->
<script setup lang="ts">
import CockpitPanelCard from '@/components/cockpit/CockpitPanelCard.vue'

defineProps<{
  leftPanels: Array<{
    id: string
    title: string
    dim?: boolean
    hideTitle?: boolean
    flex?: number
    variant?: 'default' | 'overview'
    compact?: boolean
  }>
  rightPanels: Array<{
    id: string
    title: string
    dim?: boolean
    hideTitle?: boolean
    flex?: number
    variant?: 'default' | 'overview'
    compact?: boolean
  }>
}>()
</script>

<template>
  <aside class="cockpit-aside cockpit-aside--left" aria-label="左侧看板">
    <CockpitPanelCard
      v-for="panel in leftPanels"
      :key="panel.id"
      :title="panel.title"
      :dim="panel.dim"
      :hide-title="panel.hideTitle"
      :flex="panel.flex"
      :variant="panel.variant"
      :compact="panel.compact"
    >
      <slot :name="panel.id" :panel="panel" />
    </CockpitPanelCard>
  </aside>
  <aside class="cockpit-aside cockpit-aside--right" aria-label="右侧看板">
    <CockpitPanelCard
      v-for="panel in rightPanels"
      :key="panel.id"
      :title="panel.title"
      :dim="panel.dim"
      :hide-title="panel.hideTitle"
      :flex="panel.flex"
      :variant="panel.variant"
      :compact="panel.compact"
    >
      <slot :name="panel.id" :panel="panel" />
    </CockpitPanelCard>
  </aside>
</template>

<style scoped>
.cockpit-aside {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 10px 12px;
  box-sizing: border-box;
  min-height: 0;
  pointer-events: all;
  z-index: 2;
}

.cockpit-aside--left {
  grid-column: 1;
  grid-row: 1;
  padding-left: 12px;
  background: linear-gradient(90deg, rgba(5, 13, 24, 0.55) 0%, transparent 72%);
}

.cockpit-aside--right {
  grid-column: 3;
  grid-row: 1;
  padding-right: 12px;
  background: linear-gradient(270deg, rgba(5, 13, 24, 0.55) 0%, transparent 72%);
}
</style>
