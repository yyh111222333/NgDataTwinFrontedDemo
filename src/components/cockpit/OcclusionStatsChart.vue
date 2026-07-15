<!-- 行车监测 — 遮挡监测 -->
<script setup lang="ts">
import { getOcclusionStats } from '@/api/driving-monitor'
import { useGranularityStatsChart } from '@/composables/useGranularityStatsChart'
import type { OcclusionStatusLevel } from '@/types/driving-monitor'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const STATUS_COLORS: Record<OcclusionStatusLevel, string> = {
  normal: '#5ce8ff',
  warning: '#e8c84a',
  critical: '#f87171',
}

const { granularity, statsData, loading, loadError, granularityOptions } = useGranularityStatsChart(
  getOcclusionStats,
  false,
  undefined,
  30_000,
)

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) return { backgroundColor: 'transparent' }
  const maxValue = Math.max(...data.items.map((item) => item.occlusionCount), 1)

  return {
    backgroundColor: 'transparent',
    animationDuration: 680,
    animationEasing: 'cubicOut' as const,
    grid: { left: 8, right: 28, top: 8, bottom: 4, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      textStyle: { color: '#e8fbff', fontSize: 12 },
      formatter: (params: Array<{ dataIndex: number; value: number }>) => {
        const idx = params[0]?.dataIndex ?? 0
        const item = data.items[idx]
        if (!item) return ''
        const statusText =
          item.status === 'critical' ? '告警' : item.status === 'warning' ? '预警' : '正常'
        return [item.cameraName, `告警 ${item.occlusionCount} 次`, statusText].join('<br/>')
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: Math.max(4, Math.ceil(maxValue / 5) * 5),
      splitLine: { lineStyle: { color: 'rgba(48, 200, 255, 0.08)' } },
      axisLabel: { color: 'rgba(160, 200, 220, 0.55)', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: data.items.map((it) => it.cameraName),
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(200, 238, 252, 0.82)', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 10,
        data: data.items.map((it) => ({
          value: it.occlusionCount,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: STATUS_COLORS[it.status],
            shadowBlur: 8,
            shadowColor: `${STATUS_COLORS[it.status]}55`,
          },
        })),
        label: {
          show: true,
          position: 'right',
          color: 'rgba(200, 238, 252, 0.75)',
          fontSize: 10,
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
      <span class="panel-chart__metric"><em>遮挡</em>{{ statsData.summary.totalCount }} 次</span>
      <span class="panel-chart__metric is-warn">
        <em>涉及车辆</em>{{ statsData.summary.affectedVehicleCount ?? 0 }}
      </span>
      <span class="panel-chart__metric is-risk"
        ><em>待处理</em>{{ statsData.summary.pendingCount ?? statsData.summary.alertCount }}</span
      >
    </div>
  </div>
</template>

<style scoped src="./panel-chart.css"></style>
