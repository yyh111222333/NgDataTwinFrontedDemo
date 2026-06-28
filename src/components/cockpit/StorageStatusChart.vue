<!-- 智慧监控 — 存储状况监控横向柱状图 -->
<script setup lang="ts">
import { getStorageStatus } from '@/api/smart-monitor'
import type { StorageStatusData, StorageStatusLevel } from '@/types/smart-monitor'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const STATUS_COLORS: Record<StorageStatusLevel, { main: string; shadow: string }> = {
  normal: { main: '#5ce8ff', shadow: 'rgba(92, 232, 255, 0.45)' },
  warning: { main: '#e8c84a', shadow: 'rgba(232, 200, 74, 0.45)' },
  critical: { main: '#f87171', shadow: 'rgba(248, 113, 113, 0.45)' },
}

const statsData = ref<StorageStatusData | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const loadStats = async () => {
  loading.value = true
  loadError.value = null
  try {
    statsData.value = await getStorageStatus({ useMock: true })
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    statsData.value = null
  } finally {
    loading.value = false
  }
}

const REFRESH_INTERVAL_MS = 60_000
let refreshTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  void loadStats()
  refreshTimer = setInterval(() => {
    if (!loading.value) {
      void loadStats()
    }
  }, REFRESH_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) {
    return { backgroundColor: 'transparent' }
  }

  const categories = data.items.map((it) => it.storageName)
  const seriesData = data.items.map((it) => {
    const palette = STATUS_COLORS[it.status]
    return {
      value: it.usagePercent,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: palette.main,
        shadowBlur: 10,
        shadowColor: palette.shadow,
      },
    }
  })

  return {
    backgroundColor: 'transparent',
    animationDuration: 680,
    animationEasing: 'cubicOut' as const,
    grid: {
      left: 8,
      right: 36,
      top: 8,
      bottom: 4,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(4, 14, 28, 0.92)',
      borderColor: 'rgba(92, 232, 255, 0.45)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e8fbff', fontSize: 12 },
      extraCssText: 'box-shadow: 0 0 16px rgba(48, 200, 255, 0.2); backdrop-filter: blur(8px);',
      formatter: (params: Array<{ dataIndex: number; value: number }>) => {
        const idx = params[0]?.dataIndex ?? 0
        const item = data.items[idx]
        if (!item) return ''
        const statusText =
          item.status === 'critical' ? '告警' : item.status === 'warning' ? '预警' : '正常'
        return [
          item.storageName,
          `已用 ${item.usedCapacityTb} / ${item.totalCapacityTb} TB`,
          `使用率 ${item.usagePercent}% · ${statusText}`,
        ].join('<br/>')
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: {
        lineStyle: { color: 'rgba(48, 200, 255, 0.08)' },
      },
      axisLabel: {
        color: 'rgba(160, 200, 220, 0.55)',
        fontSize: 10,
        formatter: '{value}%',
      },
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgba(200, 238, 252, 0.82)',
        fontSize: 10,
        width: 72,
        overflow: 'truncate',
      },
    },
    series: [
      {
        type: 'bar',
        barWidth: 10,
        data: seriesData,
        label: {
          show: true,
          position: 'right',
          formatter: ({ value }: { value: number }) => `${value}%`,
          color: 'rgba(200, 238, 252, 0.75)',
          fontSize: 10,
        },
      },
    ],
  }
})
</script>

<template>
  <div class="storage-status-chart">
    <div class="storage-status-chart__main">
      <p v-if="loadError" class="storage-status-chart__state is-error">{{ loadError }}</p>
      <p v-else-if="loading && !statsData" class="storage-status-chart__state">加载中…</p>
      <VChart v-else class="storage-status-chart__echart" :option="chartOption" autoresize />
      <div
        v-if="loading && statsData"
        class="storage-status-chart__loading-mask"
        aria-hidden="true"
      />
    </div>

    <div v-if="statsData" class="storage-status-chart__summary">
      <span class="storage-status-chart__metric">
        <em>总容量</em>{{ statsData.summary.totalCapacityTb }} TB
      </span>
      <span class="storage-status-chart__metric">
        <em>已用</em>{{ statsData.summary.usedCapacityTb }} TB
      </span>
      <span class="storage-status-chart__metric is-avg">
        <em>平均</em>{{ statsData.summary.avgUsagePercent }}%
      </span>
      <span
        class="storage-status-chart__metric"
        :class="{ 'is-alert': statsData.summary.alertCount > 0 }"
      >
        <em>预警</em>{{ statsData.summary.alertCount }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.storage-status-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 4px;
}

.storage-status-chart__main {
  position: relative;
  flex: 1;
  min-height: 0;
}

.storage-status-chart__echart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.storage-status-chart__state {
  margin: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgba(160, 210, 230, 0.55);
}

.storage-status-chart__state.is-error {
  color: rgba(248, 113, 113, 0.85);
}

.storage-status-chart__loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(4, 14, 28, 0.25);
  pointer-events: none;
}

.storage-status-chart__summary {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  padding: 2px 4px 0;
}

.storage-status-chart__metric {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: rgba(92, 232, 255, 0.95);
}

.storage-status-chart__metric em {
  margin-right: 4px;
  font-style: normal;
  font-size: 9px;
  color: rgba(140, 185, 205, 0.55);
}

.storage-status-chart__metric.is-avg {
  color: rgba(232, 200, 74, 0.95);
}

.storage-status-chart__metric.is-alert {
  color: rgba(248, 113, 113, 0.95);
}
</style>
