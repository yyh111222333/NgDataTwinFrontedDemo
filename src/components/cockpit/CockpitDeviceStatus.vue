<script setup lang="ts">
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { use } from 'echarts/core'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

export type DeviceStatRecord = {
  region: string
  device: string
  online: number
  offline: number
}

const props = defineProps<{
  records: DeviceStatRecord[]
  regions: string[]
  devices: string[]
}>()

const selectedRegion = ref('全部')
const selectedDevice = ref('全部')

const filteredRecords = computed(() =>
  props.records.filter((item) => {
    const regionOk = selectedRegion.value === '全部' || item.region === selectedRegion.value
    const deviceOk = selectedDevice.value === '全部' || item.device === selectedDevice.value
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
      <select v-model="selectedRegion">
        <option value="全部">区域（全部）</option>
        <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
      </select>
      <select v-model="selectedDevice">
        <option value="全部">设备（全部）</option>
        <option v-for="device in devices" :key="device" :value="device">{{ device }}</option>
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