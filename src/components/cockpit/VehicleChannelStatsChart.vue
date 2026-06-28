<!-- 车辆进出 — 通道进出统计（样式与人员区域进出统计一致） -->
<script setup lang="ts">
import { getVehicleChannelStats } from '@/api/vehicle-access'
import { resolveAccessStatsAnchor } from '@/mocks/access-stats-shared'
import type { VehicleAccessGranularity, VehicleChannelStatsData } from '@/types/vehicle-access'
import { BarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { use } from 'echarts/core'
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const granularity = defineModel<VehicleAccessGranularity>('granularity', { default: 'day' })
const statsData = ref<VehicleChannelStatsData | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const loadStats = async () => {
  loading.value = true
  loadError.value = null
  try {
    statsData.value = await getVehicleChannelStats(
      { granularity: granularity.value!, anchor: resolveAccessStatsAnchor(granularity.value!) },
      { useMock: true },
    )
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    statsData.value = null
  } finally {
    loading.value = false
  }
}

watch(granularity, () => {
  void loadStats()
})

onMounted(() => {
  void loadStats()
})

const granularityOptions = computed(
  () =>
    statsData.value?.granularityOptions ?? [
      { value: 'day' as const, label: '按日统计' },
      { value: 'month' as const, label: '按月统计' },
      { value: 'year' as const, label: '按年统计' },
    ],
)

const enterGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: '#b8f4ff' },
  { offset: 0.45, color: '#5ce8ff' },
  { offset: 1, color: 'rgba(36, 120, 180, 0.25)' },
])

const exitGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: '#ffe2a8' },
  { offset: 0.45, color: '#e8a84a' },
  { offset: 1, color: 'rgba(180, 120, 40, 0.22)' },
])

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) {
    return { backgroundColor: 'transparent' }
  }

  const categories = data.items.map((it) => it.channelName)
  const enterValues = data.items.map((it) => it.enterCount)
  const exitValues = data.items.map((it) => it.exitCount)
  const maxVal = Math.max(...enterValues, ...exitValues, 1)

  return {
    backgroundColor: 'transparent',
    animationDuration: 680,
    animationEasing: 'cubicOut' as const,
    grid: {
      left: 44,
      right: 8,
      top: 44,
      bottom: 26,
      containLabel: false,
    },
    legend: {
      top: 4,
      right: 4,
      itemWidth: 10,
      itemHeight: 8,
      itemGap: 14,
      textStyle: {
        color: 'rgba(200, 238, 252, 0.88)',
        fontSize: 11,
      },
      data: [
        { name: '进入', icon: 'roundRect' },
        { name: '离开', icon: 'roundRect' },
      ],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgba(48, 200, 255, 0.08)' },
      },
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e8fbff', fontSize: 12 },
      extraCssText: 'box-shadow: 0 0 16px rgba(48, 200, 255, 0.2); backdrop-filter: blur(8px);',
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: 'rgba(48, 200, 255, 0.28)' } },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(180, 220, 240, 0.85)',
        fontSize: 11,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      max: Math.ceil(maxVal * 1.15),
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(140, 185, 205, 0.65)',
        fontSize: 10,
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(48, 200, 255, 0.08)',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '进入',
        type: 'bar',
        barWidth: 9,
        barGap: '35%',
        data: enterValues,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: enterGradient,
          shadowColor: 'rgba(92, 232, 255, 0.55)',
          shadowBlur: 10,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(92, 232, 255, 0.75)',
          },
        },
      },
      {
        name: '离开',
        type: 'bar',
        barWidth: 9,
        data: exitValues,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: exitGradient,
          shadowColor: 'rgba(232, 168, 74, 0.45)',
          shadowBlur: 10,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(232, 168, 74, 0.65)',
          },
        },
      },
    ],
  }
})
</script>

<template>
  <div class="region-stats-chart">
    <div class="region-stats-chart__toolbar">
      <div class="region-stats-chart__period">
        <span class="region-stats-chart__period-dot" aria-hidden="true" />
        <span class="region-stats-chart__period-text">
          {{ statsData?.periodLabel ?? '—' }}
        </span>
      </div>
      <div class="region-stats-chart__granularity" role="group" aria-label="统计粒度">
        <button
          v-for="opt in granularityOptions"
          :key="opt.value"
          type="button"
          class="region-stats-chart__gran-btn"
          :class="{ 'is-active': granularity === opt.value }"
          :disabled="loading"
          @click="granularity = opt.value"
        >
          {{ opt.label.replace('统计', '') }}
        </button>
      </div>
    </div>

    <div class="region-stats-chart__main">
      <p v-if="loadError" class="region-stats-chart__state is-error">{{ loadError }}</p>
      <p v-else-if="loading && !statsData" class="region-stats-chart__state">加载中…</p>
      <VChart v-else class="region-stats-chart__echart" :option="chartOption" autoresize />
      <div v-if="loading && statsData" class="region-stats-chart__loading-mask" aria-hidden="true" />
    </div>

    <div v-if="statsData" class="region-stats-chart__summary">
      <span class="region-stats-chart__metric">
        <em>进入</em>{{ statsData.summary.enterTotal }}
      </span>
      <span class="region-stats-chart__metric is-exit">
        <em>离开</em>{{ statsData.summary.exitTotal }}
      </span>
      <span class="region-stats-chart__metric is-net">
        <em>净入</em>{{ statsData.summary.netIn >= 0 ? '+' : '' }}{{ statsData.summary.netIn }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.region-stats-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 6px;
}

.region-stats-chart__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 0;
}

.region-stats-chart__period {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.region-stats-chart__period-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ce8ff;
  box-shadow: 0 0 8px rgba(92, 232, 255, 0.8);
  flex-shrink: 0;
}

.region-stats-chart__period-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(210, 245, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.region-stats-chart__granularity {
  display: inline-flex;
  gap: 3px;
  padding: 2px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.16);
  background: rgba(4, 12, 22, 0.55);
  flex-shrink: 0;
}

.region-stats-chart__gran-btn {
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: rgba(160, 200, 220, 0.75);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.region-stats-chart__gran-btn:hover:not(:disabled) {
  color: rgba(230, 248, 255, 0.95);
  background: rgba(48, 200, 255, 0.08);
}

.region-stats-chart__gran-btn.is-active {
  color: #f0fcff;
  border-color: rgba(48, 200, 255, 0.35);
  background: linear-gradient(180deg, rgba(92, 232, 255, 0.22) 0%, rgba(48, 200, 255, 0.06) 100%);
  box-shadow: 0 0 10px rgba(48, 200, 255, 0.12);
}

.region-stats-chart__gran-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.region-stats-chart__main {
  position: relative;
  flex: 1;
  min-height: 140px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(48, 200, 255, 0.03) 0%, transparent 40%),
    rgba(2, 10, 20, 0.35);
  overflow: hidden;
}

.region-stats-chart__main::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(48, 200, 255, 0.04) 50%, transparent 100%);
  pointer-events: none;
  opacity: 0.6;
}

.region-stats-chart__echart {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 140px;
}

.region-stats-chart__state {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 12px;
  color: rgba(180, 220, 240, 0.7);
}

.region-stats-chart__state.is-error {
  color: #ff9b9b;
  padding: 0 12px;
  text-align: center;
}

.region-stats-chart__loading-mask {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: rgba(4, 12, 22, 0.35);
  pointer-events: none;
}

.region-stats-chart__summary {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px 2px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.1);
  background: rgba(4, 12, 22, 0.45);
}

.region-stats-chart__metric {
  font-size: 11px;
  font-weight: 600;
  color: #5ce8ff;
  font-variant-numeric: tabular-nums;
}

.region-stats-chart__metric em {
  margin-right: 4px;
  font-style: normal;
  font-weight: 500;
  color: rgba(160, 200, 220, 0.7);
}

.region-stats-chart__metric.is-exit {
  color: #e8a84a;
}

.region-stats-chart__metric.is-net {
  color: rgba(220, 245, 255, 0.92);
}
</style>
