<!-- 事项分布饼图（人员/车辆复用） -->
<script setup lang="ts">
import { useGranularityStatsChart } from '@/composables/useGranularityStatsChart'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

type MatterStatsPayload = {
  periodLabel?: string
  items: Array<{ matterId: string; matterName: string; count: number }>
  summary: { totalCount: number }
  granularityOptions?: ReadonlyArray<{ value: AccessStatsGranularity; label: string }>
}

const props = defineProps<{
  matterTypes: ReadonlyArray<{ id: string; name: string; color: string }>
  loader: (
    query: { granularity: AccessStatsGranularity; anchor: string },
    options: { useMock: boolean },
  ) => Promise<MatterStatsPayload>
  summaryLabel?: string
  useMock?: boolean
  refreshIntervalMs?: number
}>()

const granularity = defineModel<AccessStatsGranularity>('granularity', { default: 'day' })

const colorMap = Object.fromEntries(props.matterTypes.map((m) => [m.id, m.color]))

const { statsData, loading, loadError, granularityOptions } = useGranularityStatsChart(
  props.loader,
  props.useMock ?? true,
  granularity,
  props.refreshIntervalMs ?? 0,
)

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) return { backgroundColor: 'transparent' }

  return {
    backgroundColor: 'transparent',
    animationDuration: 720,
    animationDurationUpdate: 680,
    animationEasing: 'cubicOut' as const,
    animationEasingUpdate: 'cubicOut' as const,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e8fbff', fontSize: 12 },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>${p.value} 次 · ${p.percent.toFixed(1)}%`,
    },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 8,
      textStyle: { color: 'rgba(200, 238, 252, 0.82)', fontSize: 10 },
    },
    series: [
      {
        id: 'matter-distribution',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['36%', '50%'],
        padAngle: 2,
        animationTypeUpdate: 'transition',
        itemStyle: { borderRadius: 4, borderColor: 'rgba(4, 18, 32, 0.9)', borderWidth: 2 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 6, label: { show: false } },
        labelLine: { show: false },
        data: data.items.map((it) => ({
          name: it.matterName,
          value: it.count,
          itemStyle: {
            color: colorMap[it.matterId],
            shadowBlur: 12,
            shadowColor: `${colorMap[it.matterId]}66`,
          },
        })),
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
      <span class="panel-chart__metric">
        <em>{{ summaryLabel ?? '总事项' }}</em
        >{{ statsData.summary.totalCount }}
      </span>
    </div>
  </div>
</template>

<style scoped src="./panel-chart.css"></style>
