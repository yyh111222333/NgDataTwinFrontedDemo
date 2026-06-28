<!-- 车辆进出概况：通道进出统计柱状图 + 其余 Tab 占位。 -->
<script setup lang="ts">
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import VehicleChannelStatsChart from '@/components/cockpit/VehicleChannelStatsChart.vue'
import VehicleMatterStatsChart from '@/components/cockpit/VehicleMatterStatsChart.vue'
import VehicleTimeStatsChart from '@/components/cockpit/VehicleTimeStatsChart.vue'
import { vehicleOverviewTabs } from '@/config/cockpit'
import type { VehicleAccessGranularity } from '@/types/vehicle-access'
import { ref } from 'vue'

const granularity = ref<VehicleAccessGranularity>('day')
</script>

<template>
  <CockpitPanelTabs :tabs="vehicleOverviewTabs" ariaLabel="车辆进出概况" :bodyMinHeight="200">
    <template #default="{ activeTab }">
      <VehicleChannelStatsChart v-if="activeTab === 'channel'" v-model:granularity="granularity" />
      <VehicleMatterStatsChart v-else-if="activeTab === 'matter'" v-model:granularity="granularity" />
      <VehicleTimeStatsChart v-else-if="activeTab === 'time'" v-model:granularity="granularity" />
      <div v-else class="vehicle-overview__placeholder">
        <p class="vehicle-overview__placeholder-title">
          {{ vehicleOverviewTabs.find((t) => t.key === activeTab)?.label }}
        </p>
        <span class="vehicle-overview__placeholder-hint">图表数据待接入</span>
      </div>
    </template>
  </CockpitPanelTabs>
</template>

<style scoped>
.vehicle-overview__placeholder {
  height: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.vehicle-overview__placeholder-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.75);
}

.vehicle-overview__placeholder-hint {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(140, 185, 205, 0.45);
}
</style>
