<script setup lang="ts">
// 中间 KPI 展示组件：展示数值类指标，并对火车道状态做颜色区分。
defineProps<{
  items: Array<{ value: string | number; label: string }>
}>()
</script>

<template>
  <div class="cockpit-stats">
    <div v-for="(item, idx) in items" :key="idx" class="cockpit-stats__card">
      <div
        class="cockpit-stats__number"
        :class="{
          'is-status-idle': item.label === '火车道状态' && item.value === '空闲',
          'is-status-busy': item.label === '火车道状态' && item.value === '占用',
        }"
      >
        {{ item.value }}
      </div>
      <div class="cockpit-stats__label">{{ item.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.cockpit-stats {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  gap: 14px;
  pointer-events: all;
}
.cockpit-stats__card { min-width: 138px; height: 92px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 14px; }
.cockpit-stats__number { font-size: 38px; line-height: 1; font-weight: 700; color: #7df0ff; text-shadow: 0 0 10px rgba(64, 224, 255, 0.65); }
.cockpit-stats__number.is-status-idle { color: #55ef96; text-shadow: 0 0 10px rgba(85, 239, 150, 0.55); }
.cockpit-stats__number.is-status-busy { color: #ff5a5a; text-shadow: 0 0 10px rgba(255, 90, 90, 0.55); }
.cockpit-stats__label { margin-top: 8px; font-size: 13px; color: rgba(205, 241, 255, 0.88); }
</style>

