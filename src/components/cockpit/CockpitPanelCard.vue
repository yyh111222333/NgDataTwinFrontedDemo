<script setup lang="ts">
// 单个看板壳组件：
// - title: 标题
// - dim: 是否用“矮一点”的版式
withDefaults(
  defineProps<{
    title: string
    dim?: boolean
  }>(),
  {
    dim: false,
  },
)
</script>

<template>
  <section class="cockpit-panel-card" :class="{ 'is-dim': dim }">
    <!-- 统一标题区域 -->
    <h3 class="cockpit-panel-card__title">{{ title }}</h3>
    <!-- 内容由父组件传入（图表、数字、列表都可） -->
    <slot />
  </section>
</template>

<style scoped>
.cockpit-panel-card {
  flex: 1;
  min-height: 120px;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid rgba(48, 220, 255, 0.35);
  background: transparent;
  box-shadow:
    inset 0 0 16px rgba(48, 220, 255, 0.08),
    0 0 12px rgba(48, 220, 255, 0.14);
}

.cockpit-panel-card.is-dim {
  flex: 0.6;
  opacity: 0.95;
}

.cockpit-panel-card__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #8cefff;
}
</style>

