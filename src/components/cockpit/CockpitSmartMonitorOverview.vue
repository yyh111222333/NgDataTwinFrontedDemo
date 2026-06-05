<!-- 智慧监控概况：危险事件统计饼图 + 其余 Tab 占位。 -->
<script setup lang="ts">
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import DangerEventStatsChart from '@/components/cockpit/DangerEventStatsChart.vue'
import { smartMonitorTabs } from '@/config/cockpit'
</script>

<template>
  <CockpitPanelTabs :tabs="smartMonitorTabs" ariaLabel="智慧监控概况">
    <template #default="{ activeTab }">
      <DangerEventStatsChart v-if="activeTab === 'danger'" />
      <div v-else class="smart-overview__placeholder">
        <p class="smart-overview__placeholder-title">
          {{ smartMonitorTabs.find((t) => t.key === activeTab)?.label }}
        </p>
        <span class="smart-overview__placeholder-hint">图表数据待接入</span>
      </div>
    </template>
  </CockpitPanelTabs>
</template>

<style scoped>
.smart-overview__placeholder {
  height: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.smart-overview__placeholder-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.75);
}

.smart-overview__placeholder-hint {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(140, 185, 205, 0.45);
}
</style>
