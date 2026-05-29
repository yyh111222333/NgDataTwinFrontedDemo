<!-- 人员进出概况：区域进出统计柱状图 + 其余 Tab 占位。 -->
<script setup lang="ts">
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import PersonnelRegionStatsChart from '@/components/cockpit/PersonnelRegionStatsChart.vue'
import { personnelOverviewTabs } from '@/config/cockpit'
</script>

<template>
  <CockpitPanelTabs :tabs="personnelOverviewTabs" ariaLabel="人员进出概况" :bodyMinHeight="200">
    <template #default="{ activeTab }">
      <PersonnelRegionStatsChart v-if="activeTab === 'region'" />
      <div v-else class="personnel-overview__placeholder">
        <p class="personnel-overview__placeholder-title">
          {{ personnelOverviewTabs.find((t) => t.key === activeTab)?.label }}
        </p>
        <span class="personnel-overview__placeholder-hint">图表数据待接入</span>
      </div>
    </template>
  </CockpitPanelTabs>
</template>

<style scoped>
.personnel-overview__placeholder {
  height: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.personnel-overview__placeholder-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.75);
}

.personnel-overview__placeholder-hint {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(140, 185, 205, 0.45);
}
</style>
