<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { use } from 'echarts/core'
import type { DeviceStatusOption } from '@/types/dashboard'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

export type DeviceStatRecord = {
  region: string
  device: string
  online: number
  offline: number
}

const props = defineProps<{
  records: DeviceStatRecord[]
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

const selectedRegionName = computed(() => {
  return props.regionOptions.find((it) => it.id === props.selectedRegionId)?.name ?? '全部'
})

const selectedDeviceName = computed(() => {
  return props.deviceOptions.find((it) => it.id === props.selectedDeviceType)?.name ?? '全部'
})

const onRegionSelect = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:selectedRegionId', value)
  emit('region-change', value)
}

const onDeviceSelect = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:selectedDeviceType', value)
  emit('device-change', value)
}

const filteredRecords = computed(() =>
  props.records.filter((item) => {
    const regionOk = props.selectedRegionId === 'all' || item.region === selectedRegionName.value
    const deviceOk = props.selectedDeviceType === 'all' || item.device === selectedDeviceName.value
    return regionOk && deviceOk
  }),
)

const summary = computed(() => {
  const online = filteredRecords.value.reduce((sum, it) => sum + it.online, 0)
  const offline = filteredRecords.value.reduce((sum, it) => sum + it.offline, 0)
  const total = online + offline
  const rate = total > 0 ? ((online / total) * 100).toFixed(1) : '0.0'
  return { online, offline, total, rate }
})

const pieOption = computed(() => ({
  backgroundColor: 'transparent',
  color: ['#55ef96', '#ff5a5a'],
  tooltip: { trigger: 'item' },
  series: [
    {
      name: '在线统计',
      type: 'pie',
      radius: ['52%', '76%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      label: { show: false },
      data: [
        { value: summary.value.online, name: '在线' },
        { value: summary.value.offline, name: '离线' },
      ],
    },
  ],
}))
</script>

<template>
  <div class="device-status">
    <div class="device-status__filters">
      <select
        :value="selectedRegionId"
        @change="onRegionSelect"
      >
        <option v-for="region in regionOptions" :key="region.id" :value="region.id">
          {{ region.name }}
        </option>
      </select>
      <select
        :value="selectedDeviceType"
        @change="onDeviceSelect"
      >
        <option v-for="device in deviceOptions" :key="device.id" :value="device.id">
          {{ device.name }}
        </option>
      </select>
    </div>

    <div class="device-status__content">
      <div class="device-status__chart-wrap">
        <VChart class="device-status__chart" :option="pieOption" autoresize />
      </div>

      <div class="device-status__summary">
        <div>设备: {{ summary.total }}</div>
        <div class="is-online">在线: {{ summary.online }}</div>
        <div class="is-offline">离线: {{ summary.offline }}</div>
        <div>在线率: {{ summary.rate }}%</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-status {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 8px;
}
.device-status__filters {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(48, 220, 255, 0.24);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(13, 35, 58, 0.52), rgba(8, 20, 36, 0.3));
}
.device-status__filters select {
  height: 24px;
  border: 1px solid rgba(48, 220, 255, 0.35);
  border-radius: 4px;
  background: rgba(7, 21, 36, 0.92);
  color: #d9f8ff;
  font-size: 12px;
  padding: 0 6px;
  outline: none;
}
.device-status__content {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  overflow: auto;
}
.device-status__chart-wrap {
  min-height: 122px;
}
.device-status__chart { width: 100%; height: 100%; min-height: 122px; }
.device-status__summary {
  color: #dff9ff;
  font-size: 12px;
  line-height: 1.85;
  padding: 2px 4px;
}
.device-status__summary .is-online { color: #55ef96; }
.device-status__summary .is-offline { color: #ff6d6d; }
</style>