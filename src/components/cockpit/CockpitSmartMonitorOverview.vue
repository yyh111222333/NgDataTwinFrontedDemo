<!-- 智慧监控概况：危险事件 / 设备在位统计 / 存储状况 -->
<script setup lang="ts">
import CockpitDeviceStatus from '@/components/cockpit/CockpitDeviceStatus.vue'
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import DangerEventStatsChart from '@/components/cockpit/DangerEventStatsChart.vue'
import StorageStatusChart from '@/components/cockpit/StorageStatusChart.vue'
import { smartMonitorTabs } from '@/config/cockpit'
import type { DeviceStatusOption, DashboardDeviceRecord } from '@/types/dashboard'

defineProps<{
  deviceRecords: DashboardDeviceRecord[]
  regionOptions: DeviceStatusOption[]
  deviceOptions: DeviceStatusOption[]
  selectedRegionId: string
  selectedDeviceType: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedRegionId', value: string): void
  (e: 'update:selectedDeviceType', value: string): void
  (e: 'region-change', value: string): void
  (e: 'device-change', value: string): void
}>()
</script>

<template>
  <CockpitPanelTabs :tabs="smartMonitorTabs" ariaLabel="智慧监控概况">
    <template #default="{ activeTab }">
      <DangerEventStatsChart v-if="activeTab === 'danger'" />
      <CockpitDeviceStatus
        v-else-if="activeTab === 'device'"
        class="smart-overview__device"
        :records="deviceRecords"
        :region-options="regionOptions"
        :device-options="deviceOptions"
        :selected-region-id="selectedRegionId"
        :selected-device-type="selectedDeviceType"
        @update:selected-region-id="emit('update:selectedRegionId', $event)"
        @update:selected-device-type="emit('update:selectedDeviceType', $event)"
        @region-change="emit('region-change', $event)"
        @device-change="emit('device-change', $event)"
      />
      <StorageStatusChart v-else-if="activeTab === 'storage'" />
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
.smart-overview__device {
  height: 100%;
  min-height: 168px;
}

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
