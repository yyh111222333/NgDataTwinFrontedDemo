<!-- 智慧监控 — 危险事件统计饼图 -->
<script setup lang="ts">
import { getSmartMonitorDashboard } from '@/api/smart-monitor-dashboard'
import type { SmartMonitorDashboardData } from '@/types/smart-monitor-dashboard'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const EVENT_COLORS = [
  '#5ce8ff',
  '#4ade80',
  '#e8c84a',
  '#f59e0b',
  '#f87171',
  '#a78bfa',
  '#38bdf8',
  '#fb7185',
] as const

const dashboard = ref<SmartMonitorDashboardData | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const loadStats = async () => {
  loading.value = true
  loadError.value = null
  try {
    dashboard.value = await getSmartMonitorDashboard({ force: true })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading.value = false
  }
}

let refreshTimer: number | null = null

onMounted(() => {
  void loadStats()
  refreshTimer = window.setInterval(() => void loadStats(), 30_000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
})

const rankItems = computed(() => dashboard.value?.last7DayRankData ?? [])

const rankedTotal = computed(() =>
  rankItems.value.reduce((sum, item) => sum + item.count, 0),
)

const periodLabel = computed(() => {
  const points = dashboard.value?.last7DayChartData ?? []
  if (points.length < 2) return '最近7日'
  const format = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
  return `${format(points[0]!.x)} - ${format(points[points.length - 1]!.x)}`
})

const chartOption = computed(() => {
  if (!rankItems.value.length) {
    return { backgroundColor: 'transparent' }
  }

  const seriesData = rankItems.value.map((item, index) => ({
    name: item.name,
    value: item.count,
    itemStyle: {
      color: EVENT_COLORS[index % EVENT_COLORS.length],
      shadowBlur: 12,
      shadowColor: `${EVENT_COLORS[index % EVENT_COLORS.length]}66`,
    },
  }))

  return {
    backgroundColor: 'transparent',
    animationDuration: 720,
    animationEasing: 'cubicOut' as const,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e8fbff', fontSize: 12 },
      extraCssText: 'box-shadow: 0 0 16px rgba(48, 200, 255, 0.2); backdrop-filter: blur(8px);',
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/>${p.value} 次 · ${p.percent.toFixed(1)}%`,
    },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 3,
      textStyle: {
        color: 'rgba(200, 238, 252, 0.82)',
        fontSize: 9,
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['31%', '50%'],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 4,
          borderColor: 'rgba(4, 18, 32, 0.9)',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: { show: false },
        },
        labelLine: { show: false },
        data: seriesData,
      },
    ],
  }
})
</script>

<template>
  <div class="danger-event-chart">
    <div class="danger-event-chart__toolbar">
      <div class="danger-event-chart__period">
        <span class="danger-event-chart__period-dot" aria-hidden="true" />
        <span class="danger-event-chart__period-text">
          {{ periodLabel }}
        </span>
      </div>
      <span class="danger-event-chart__source">智慧监控子系统</span>
    </div>

    <div class="danger-event-chart__main">
      <p v-if="loadError && !dashboard" class="danger-event-chart__state is-error">
        {{ loadError }}
      </p>
      <p v-else-if="loading && !dashboard" class="danger-event-chart__state">加载中…</p>
      <VChart v-else class="danger-event-chart__echart" :option="chartOption" autoresize />
      <div v-if="loading && dashboard" class="danger-event-chart__loading-mask" aria-hidden="true" />
    </div>

    <div v-if="dashboard" class="danger-event-chart__summary">
      <span class="danger-event-chart__metric">
        <em>近7日</em>{{ rankedTotal }}
      </span>
      <span class="danger-event-chart__metric is-today">
        <em>今日告警</em>{{ dashboard.todayAlarmTotalCount }}
      </span>
      <span class="danger-event-chart__metric is-risk">
        <em>待处理</em>{{ dashboard.todayAlarmUnHandleCount }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.danger-event-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 4px;
}

.danger-event-chart__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 0;
}

.danger-event-chart__period {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.danger-event-chart__period-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ce8ff;
  box-shadow: 0 0 8px rgba(92, 232, 255, 0.8);
  flex-shrink: 0;
}

.danger-event-chart__period-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(210, 245, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.danger-event-chart__source {
  flex-shrink: 0;
  color: rgba(85, 239, 150, 0.75);
  font-size: 10px;
}

.danger-event-chart__main {
  position: relative;
  flex: 1;
  min-height: 0;
}

.danger-event-chart__echart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.danger-event-chart__state {
  margin: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgba(160, 210, 230, 0.55);
}

.danger-event-chart__state.is-error {
  color: rgba(248, 113, 113, 0.85);
}

.danger-event-chart__loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(4, 14, 28, 0.25);
  pointer-events: none;
}

.danger-event-chart__summary {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  padding: 2px 4px 0;
}

.danger-event-chart__metric {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(92, 232, 255, 0.95);
}

.danger-event-chart__metric em {
  margin-right: 6px;
  font-style: normal;
  font-size: 10px;
  color: rgba(140, 185, 205, 0.55);
}

.danger-event-chart__metric.is-risk {
  color: rgba(248, 113, 113, 0.95);
}

.danger-event-chart__metric.is-today {
  color: rgba(85, 239, 150, 0.95);
}
</style>
