<!-- 智慧监控 — 危险事件统计饼图 -->
<script setup lang="ts">
import { getDangerEventStats } from '@/api/smart-monitor'
import { defaultDangerEventStatsAnchors } from '@/mocks/smart-monitor-danger-event-stats'
import {
  DANGER_EVENT_TYPES,
  type DangerEventStatsData,
  type SmartMonitorGranularity,
} from '@/types/smart-monitor'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const eventColorMap = Object.fromEntries(
  DANGER_EVENT_TYPES.map((e) => [e.id, e.color]),
) as Record<string, string>

const granularity = ref<SmartMonitorGranularity>('day')
const statsData = ref<DangerEventStatsData | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const anchors = defaultDangerEventStatsAnchors()
const resolveAnchor = (g: SmartMonitorGranularity) => anchors[g]

const loadStats = async () => {
  loading.value = true
  loadError.value = null
  try {
    statsData.value = await getDangerEventStats(
      { granularity: granularity.value, anchor: resolveAnchor(granularity.value) },
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

const chartOption = computed(() => {
  const data = statsData.value
  if (!data?.items.length) {
    return { backgroundColor: 'transparent' }
  }

  const seriesData = data.items.map((it) => ({
    name: it.eventName,
    value: it.count,
    itemStyle: {
      color: eventColorMap[it.eventId],
      shadowBlur: 12,
      shadowColor: `${eventColorMap[it.eventId]}66`,
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
      itemGap: 8,
      textStyle: {
        color: 'rgba(200, 238, 252, 0.82)',
        fontSize: 10,
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['36%', '50%'],
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
          {{ statsData?.periodLabel ?? '—' }}
        </span>
      </div>
      <div class="danger-event-chart__granularity" role="group" aria-label="统计粒度">
        <button
          v-for="opt in granularityOptions"
          :key="opt.value"
          type="button"
          class="danger-event-chart__gran-btn"
          :class="{ 'is-active': granularity === opt.value }"
          :disabled="loading"
          @click="granularity = opt.value"
        >
          {{ opt.label.replace('统计', '') }}
        </button>
      </div>
    </div>

    <div class="danger-event-chart__main">
      <p v-if="loadError" class="danger-event-chart__state is-error">{{ loadError }}</p>
      <p v-else-if="loading && !statsData" class="danger-event-chart__state">加载中…</p>
      <VChart v-else class="danger-event-chart__echart" :option="chartOption" autoresize />
      <div v-if="loading && statsData" class="danger-event-chart__loading-mask" aria-hidden="true" />
    </div>

    <div v-if="statsData" class="danger-event-chart__summary">
      <span class="danger-event-chart__metric">
        <em>总事件</em>{{ statsData.summary.totalCount }}
      </span>
      <span class="danger-event-chart__metric is-risk">
        <em>高风险</em>{{ statsData.summary.highRiskCount }}
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
  gap: 6px;
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
  background: #f87171;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.8);
  flex-shrink: 0;
}

.danger-event-chart__period-text {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(200, 238, 252, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.danger-event-chart__granularity {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 4px;
  background: rgba(8, 28, 48, 0.55);
  border: 1px solid rgba(72, 160, 200, 0.2);
}

.danger-event-chart__gran-btn {
  padding: 3px 8px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(160, 210, 230, 0.65);
  background: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  transition:
    color 0.2s,
    background 0.2s;
}

.danger-event-chart__gran-btn:hover:not(:disabled) {
  color: rgba(200, 238, 252, 0.9);
}

.danger-event-chart__gran-btn.is-active {
  color: #0a1e30;
  background: linear-gradient(180deg, #7ef0ff 0%, #3cc8e8 100%);
  box-shadow: 0 0 10px rgba(92, 232, 255, 0.35);
}

.danger-event-chart__gran-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.danger-event-chart__main {
  position: relative;
  flex: 1;
  min-height: 120px;
}

.danger-event-chart__echart {
  width: 100%;
  height: 100%;
  min-height: 120px;
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
</style>
