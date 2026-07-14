<!-- 进出时间分布折线图（人员/车辆复用） -->
<script setup lang="ts">
import { useGranularityStatsChart } from '@/composables/useGranularityStatsChart'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

type TimeStatsPayload = {
  periodLabel?: string
  items: Array<{ slotLabel: string; enterCount: number; exitCount: number }>
  summary: {
    enterTotal: number
    exitTotal: number
    peakSlotLabel: string
    peakTotal: number
  }
  granularityOptions?: ReadonlyArray<{ value: AccessStatsGranularity; label: string }>
}

const props = defineProps<{
  loader: (
    query: { granularity: AccessStatsGranularity; anchor: string },
    options: { useMock: boolean },
  ) => Promise<TimeStatsPayload>
  useMock?: boolean
  refreshIntervalMs?: number
}>()

const granularity = defineModel<AccessStatsGranularity>('granularity', { default: 'day' })

const enterLineColor = '#5ce8ff'
const exitLineColor = '#e8a84a'

const { statsData, loading, loadError, granularityOptions } = useGranularityStatsChart(
  props.loader,
  props.useMock ?? true,
  granularity,
  props.refreshIntervalMs ?? 0,
)

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) return { backgroundColor: 'transparent' }

  const categories = data.items.map((it) => it.slotLabel)
  const enterValues = data.items.map((it) => it.enterCount)
  const exitValues = data.items.map((it) => it.exitCount)

  return {
    backgroundColor: 'transparent',
    animationDuration: 680,
    animationEasing: 'cubicOut' as const,
    grid: { left: 36, right: 8, top: 40, bottom: 28, containLabel: false },
    legend: {
      top: 2,
      right: 4,
      itemWidth: 10,
      itemHeight: 8,
      textStyle: { color: 'rgba(200, 238, 252, 0.88)', fontSize: 10 },
      data: [{ name: '进入' }, { name: '离开' }],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      textStyle: { color: '#e8fbff', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: 'rgba(160, 200, 220, 0.7)', fontSize: 9, interval: 0, rotate: 35 },
      axisLine: { lineStyle: { color: 'rgba(48, 200, 255, 0.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(48, 200, 255, 0.08)' } },
      axisLabel: { color: 'rgba(160, 200, 220, 0.55)', fontSize: 10 },
    },
    series: [
      {
        name: '进入',
        type: 'line',
        data: enterValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: enterLineColor,
          width: 2,
        },
        itemStyle: {
          color: enterLineColor,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(92, 232, 255, 0.25)' },
            { offset: 1, color: 'rgba(92, 232, 255, 0.02)' },
          ]),
        },
      },
      {
        name: '离开',
        type: 'line',
        data: exitValues,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: exitLineColor,
          width: 2,
        },
        itemStyle: {
          color: exitLineColor,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(232, 168, 74, 0.22)' },
            { offset: 1, color: 'rgba(232, 168, 74, 0.02)' },
          ]),
        },
      },
    ],
  }
})
</script>

<template>
  <div class="panel-chart">
    <div class="panel-chart__toolbar">
      <div class="panel-chart__period">
        <span class="panel-chart__period-dot" aria-hidden="true" />
        <span class="panel-chart__period-text">{{ statsData?.periodLabel ?? '—' }}</span>
      </div>
      <div class="panel-chart__granularity" role="group" aria-label="统计粒度">
        <button
          v-for="opt in granularityOptions"
          :key="opt.value"
          type="button"
          class="panel-chart__gran-btn"
          :class="{ 'is-active': granularity === opt.value }"
          :disabled="loading"
          @click="granularity = opt.value"
        >
          {{ opt.label.replace('统计', '') }}
        </button>
      </div>
    </div>
    <div class="panel-chart__main">
      <p v-if="loadError" class="panel-chart__state is-error">{{ loadError }}</p>
      <p v-else-if="loading && !statsData" class="panel-chart__state">加载中…</p>
      <VChart v-else class="panel-chart__echart" :option="chartOption" autoresize />
      <div v-if="loading && statsData" class="panel-chart__loading-mask" aria-hidden="true" />
    </div>
    <div v-if="statsData" class="panel-chart__summary">
      <span class="panel-chart__metric"><em>进入</em>{{ statsData.summary.enterTotal }}</span>
      <span class="panel-chart__metric is-warn"
        ><em>离开</em>{{ statsData.summary.exitTotal }}</span
      >
      <span class="panel-chart__metric">
        <em>高峰</em>{{ statsData.summary.peakSlotLabel }} ({{ statsData.summary.peakTotal }})
      </span>
    </div>
  </div>
</template>

<style scoped src="./panel-chart.css"></style>
