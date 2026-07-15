<!-- 行车监测 — 疲劳次数统计 -->
<script setup lang="ts">
import { getFatigueStats } from '@/api/driving-monitor'
import { useGranularityStatsChart } from '@/composables/useGranularityStatsChart'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const barGradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
  { offset: 0, color: '#b8f4ff' },
  { offset: 0.45, color: '#5ce8ff' },
  { offset: 1, color: 'rgba(36, 120, 180, 0.25)' },
])

const { granularity, statsData, loading, loadError, granularityOptions } = useGranularityStatsChart(
  getFatigueStats,
  false,
  undefined,
  30_000,
)

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) return { backgroundColor: 'transparent' }
  const maxValue = Math.max(...data.items.map((item) => item.fatigueCount), 1)

  return {
    backgroundColor: 'transparent',
    animationDuration: 680,
    animationEasing: 'cubicOut' as const,
    grid: { left: 36, right: 8, top: 16, bottom: 24, containLabel: false },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      textStyle: { color: '#e8fbff', fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: data.items.map((it) => it.craneName),
      axisLabel: { color: 'rgba(160, 200, 220, 0.75)', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(48, 200, 255, 0.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: Math.max(4, Math.ceil(maxValue / 5) * 5),
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(48, 200, 255, 0.08)' } },
      axisLabel: { color: 'rgba(160, 200, 220, 0.55)', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: data.items.map((it) => it.fatigueCount),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: barGradient,
          shadowBlur: 10,
          shadowColor: 'rgba(92, 232, 255, 0.35)',
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
      <span class="panel-chart__metric"><em>风险人数</em>{{ statsData.summary.totalCount }}</span>
      <span class="panel-chart__metric is-warn">
        <em>疲劳预警</em>{{ statsData.summary.warningCount ?? statsData.summary.totalCount }}
      </span>
      <span class="panel-chart__metric is-risk">
        <em>高风险</em>{{ statsData.summary.highRiskCount ?? statsData.summary.maxCount }}
      </span>
    </div>
  </div>
</template>

<style scoped src="./panel-chart.css"></style>
