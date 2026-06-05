<!-- 行车监测概况：停车评分统计饼图 + 其余 Tab 占位。 -->
<script setup lang="ts">
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import ParkingScoreStatsChart from '@/components/cockpit/ParkingScoreStatsChart.vue'
import { drivingMonitorTabs } from '@/config/cockpit'
</script>

<template>
  <CockpitPanelTabs :tabs="drivingMonitorTabs" ariaLabel="行车监测概况">
    <template #default="{ activeTab }">
      <ParkingScoreStatsChart v-if="activeTab === 'parking'" />
      <div v-else class="driving-overview__placeholder">
        <p class="driving-overview__placeholder-title">
          {{ drivingMonitorTabs.find((t) => t.key === activeTab)?.label }}
        </p>
        <span class="driving-overview__placeholder-hint">图表数据待接入</span>
      </div>
    </template>
  </CockpitPanelTabs>
</template>

<style scoped>
.driving-overview__placeholder {
  height: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.driving-overview__placeholder-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.75);
}

.driving-overview__placeholder-hint {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(140, 185, 205, 0.45);
}
</style>
