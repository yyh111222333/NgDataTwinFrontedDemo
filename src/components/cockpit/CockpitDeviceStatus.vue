<!-- 设备状态组件：按区域/设备筛选并展示在线离线统计图。 -->
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { PieChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { use } from 'echarts/core'
import type { DeviceStatusOption } from '@/types/dashboard'

use([PieChart, TooltipComponent, CanvasRenderer])

export type DeviceStatRecord = {
  region: string
  device: string
  online: number
  abnormal: number
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
  const abnormal = filteredRecords.value.reduce((sum, it) => sum + (it.abnormal ?? 0), 0)
  const offline = filteredRecords.value.reduce((sum, it) => sum + it.offline, 0)
  return { online, abnormal, offline, total: online + abnormal + offline }
})

/** 将 tooltip 固定在环图中心空白区，避免贴边被面板裁切 */
const resolvePieTooltipPosition = (
  _point: [number, number],
  _params: unknown,
  _dom: HTMLDivElement,
  _rect: { x: number; y: number; width: number; height: number },
  size: { contentSize: [number, number]; viewSize: [number, number] },
): [number, number] => {
  const pad = 6
  const [cw, ch] = size.contentSize
  const [vw, vh] = size.viewSize
  const x = Math.max(pad, (vw - cw) / 2)
  const y = Math.max(pad, (vh - ch) / 2)
  return [x, y]
}

const pieOption = computed(() => {
  const { online, abnormal, offline, total } = summary.value
  if (total <= 0) {
    return { backgroundColor: 'transparent' }
  }

  const segments = [
    {
      value: online,
      name: '在线',
      itemStyle: {
        color: '#55ef96',
        shadowBlur: 12,
        shadowColor: 'rgba(85, 239, 150, 0.45)',
      },
    },
    {
      value: abnormal,
      name: '异常',
      itemStyle: {
        color: '#ffd54f',
        shadowBlur: 12,
        shadowColor: 'rgba(255, 213, 79, 0.45)',
      },
    },
    {
      value: offline,
      name: '离线',
      itemStyle: {
        color: '#ff6b6b',
        shadowBlur: 12,
        shadowColor: 'rgba(255, 107, 107, 0.45)',
      },
    },
  ].filter((item) => item.value > 0)

  return {
    backgroundColor: 'transparent',
    animationDuration: 720,
    animationEasing: 'cubicOut' as const,
    tooltip: {
      trigger: 'item',
      confine: true,
      appendTo: () => document.body,
      position: resolvePieTooltipPosition,
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e8fbff', fontSize: 12 },
      extraCssText:
        'box-shadow: 0 0 16px rgba(48, 200, 255, 0.2); backdrop-filter: blur(8px); z-index: 9999;',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>${p.value} 台 · ${p.percent.toFixed(1)}%`,
    },
    series: [
      {
        name: '在线统计',
        type: 'pie',
        radius: ['42%', '64%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'rgba(4, 18, 32, 0.9)',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 5,
        },
        labelLine: { show: false },
        data: segments,
      },
    ],
  }
})
</script>

<template>
  <div class="device-status">
    <div class="device-status__body">
      <div class="device-status__chart-wrap">
        <p v-if="summary.total <= 0" class="device-status__state">暂无设备数据</p>
        <VChart v-else class="device-status__chart" :option="pieOption" autoresize />
      </div>

      <aside class="device-status__aside">
        <div class="device-status__filters">
          <label class="device-status__filter">
            <span class="device-status__filter-label">区域</span>
            <div class="device-status__select-wrap">
              <select
                class="device-status__select"
                :value="selectedRegionId"
                @change="onRegionSelect"
              >
                <option v-for="region in regionOptions" :key="region.id" :value="region.id">
                  {{ region.name }}
                </option>
              </select>
            </div>
          </label>
          <label class="device-status__filter">
            <span class="device-status__filter-label">设备</span>
            <div class="device-status__select-wrap">
              <select
                class="device-status__select"
                :value="selectedDeviceType"
                @change="onDeviceSelect"
              >
                <option v-for="device in deviceOptions" :key="device.id" :value="device.id">
                  {{ device.name }}
                </option>
              </select>
            </div>
          </label>
        </div>
      </aside>
    </div>

    <div v-if="summary.total > 0" class="device-status__legend" aria-label="图例">
      <span class="device-status__legend-item">
        <i class="device-status__legend-dot is-online" aria-hidden="true" />
        在线
      </span>
      <span class="device-status__legend-item">
        <i class="device-status__legend-dot is-abnormal" aria-hidden="true" />
        异常
      </span>
      <span class="device-status__legend-item">
        <i class="device-status__legend-dot is-offline" aria-hidden="true" />
        离线
      </span>
    </div>
  </div>
</template>

<style scoped>
.device-status {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 2px;
  box-sizing: border-box;
}

.device-status__body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: 10px;
  overflow: visible;
}

.device-status__chart-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: visible;
}

.device-status__aside {
  flex: 0 0 auto;
  width: 46%;
  max-width: 168px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  padding: 6px 2px 4px 0;
  overflow: visible;
}

.device-status__filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-status__filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.device-status__filter-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: rgba(160, 200, 220, 0.75);
}

.device-status__select-wrap {
  position: relative;
}

.device-status__select-wrap::after {
  content: '';
  position: absolute;
  right: 10px;
  top: 50%;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid rgba(92, 232, 255, 0.75);
  transform: translateY(-35%);
  pointer-events: none;
}

.device-status__select {
  width: 100%;
  height: 32px;
  padding: 0 26px 0 12px;
  border: 1px solid rgba(48, 220, 255, 0.22);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(8, 24, 42, 0.92) 0%, rgba(4, 14, 28, 0.88) 100%);
  color: rgba(230, 248, 255, 0.95);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.device-status__select:hover {
  border-color: rgba(48, 220, 255, 0.38);
}

.device-status__select:focus {
  border-color: rgba(92, 232, 255, 0.55);
  box-shadow: 0 0 12px rgba(48, 200, 255, 0.15);
}

.device-status__select option {
  background: #071524;
  color: #d9f8ff;
}

.device-status__chart {
  width: 100%;
  height: 100%;
  min-height: 96px;
}

.device-status__state {
  margin: 0;
  height: 100%;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgba(160, 210, 230, 0.55);
}

.device-status__legend {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px 2px 2px;
  border-top: 1px solid rgba(48, 220, 255, 0.1);
}

.device-status__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.82);
  white-space: nowrap;
}

.device-status__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.device-status__legend-dot.is-online {
  background: #55ef96;
  box-shadow: 0 0 6px rgba(85, 239, 150, 0.55);
}

.device-status__legend-dot.is-abnormal {
  background: #ffd54f;
  box-shadow: 0 0 6px rgba(255, 213, 79, 0.55);
}

.device-status__legend-dot.is-offline {
  background: #ff6b6b;
  box-shadow: 0 0 6px rgba(255, 107, 107, 0.55);
}
</style>
