<!-- 行车监测 — 停车评分统计饼图 -->
<script setup lang="ts">
import { getParkingScoreStats } from '@/api/driving-monitor'
import { defaultParkingScoreStatsAnchors } from '@/mocks/driving-monitor-parking-score-stats'
import {
  PARKING_SCORE_GRADES,
  type DrivingMonitorGranularity,
  type ParkingScoreStatsData,
} from '@/types/driving-monitor'
import { PieChart } from 'echarts/charts'
import { LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import VChart from 'vue-echarts'

use([PieChart, TooltipComponent, LegendComponent, CanvasRenderer])

const gradeColorMap = Object.fromEntries(
  PARKING_SCORE_GRADES.map((g) => [g.id, g.color]),
) as Record<string, string>

const granularity = ref<DrivingMonitorGranularity>('day')
const statsData = ref<ParkingScoreStatsData | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const anchors = defaultParkingScoreStatsAnchors()
const resolveAnchor = (g: DrivingMonitorGranularity) => anchors[g]

const loadStats = async () => {
  loading.value = true
  loadError.value = null
  try {
    statsData.value = await getParkingScoreStats(
      { granularity: granularity.value, anchor: resolveAnchor(granularity.value) },
      { useMock: false },
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

let refreshTimer: number | null = null

onMounted(() => {
  void loadStats()
  refreshTimer = window.setInterval(() => void loadStats(), 30_000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
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
    name: it.gradeName,
    value: it.count,
    itemStyle: {
      color: gradeColorMap[it.gradeId],
      shadowBlur: 12,
      shadowColor: `${gradeColorMap[it.gradeId]}66`,
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
      itemGap: 6,
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
  <div class="parking-score-chart">
    <div class="parking-score-chart__toolbar">
      <div class="parking-score-chart__period">
        <span class="parking-score-chart__period-dot" aria-hidden="true" />
        <span class="parking-score-chart__period-text">
          {{ statsData?.periodLabel ?? '—' }}
        </span>
      </div>
      <div class="parking-score-chart__granularity" role="group" aria-label="统计粒度">
        <button
          v-for="opt in granularityOptions"
          :key="opt.value"
          type="button"
          class="parking-score-chart__gran-btn"
          :class="{ 'is-active': granularity === opt.value }"
          :disabled="loading"
          @click="granularity = opt.value"
        >
          {{ opt.label.replace('统计', '') }}
        </button>
      </div>
    </div>

    <div class="parking-score-chart__main">
      <p v-if="loadError" class="parking-score-chart__state is-error">{{ loadError }}</p>
      <p v-else-if="loading && !statsData" class="parking-score-chart__state">加载中…</p>
      <VChart v-else class="parking-score-chart__echart" :option="chartOption" autoresize />
      <div
        v-if="loading && statsData"
        class="parking-score-chart__loading-mask"
        aria-hidden="true"
      />
    </div>

    <div v-if="statsData" class="parking-score-chart__summary">
      <span class="parking-score-chart__metric">
        <em>总次数</em>{{ statsData.summary.totalCount }}
      </span>
      <span class="parking-score-chart__metric is-avg">
        <em>平均分</em>{{ statsData.summary.averageScore }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.parking-score-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 4px;
}

.parking-score-chart__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 0;
}

.parking-score-chart__period {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.parking-score-chart__period-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5ce8ff;
  box-shadow: 0 0 8px rgba(92, 232, 255, 0.8);
  flex-shrink: 0;
}

.parking-score-chart__period-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(210, 245, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.parking-score-chart__granularity {
  display: inline-flex;
  gap: 3px;
  padding: 2px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.16);
  background: rgba(4, 12, 22, 0.55);
  flex-shrink: 0;
}

.parking-score-chart__gran-btn {
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

.parking-score-chart__gran-btn:hover:not(:disabled) {
  color: rgba(230, 248, 255, 0.95);
  background: rgba(48, 200, 255, 0.08);
}

.parking-score-chart__gran-btn.is-active {
  color: #f0fcff;
  border-color: rgba(48, 200, 255, 0.35);
  background: linear-gradient(180deg, rgba(92, 232, 255, 0.22) 0%, rgba(48, 200, 255, 0.06) 100%);
  box-shadow: 0 0 10px rgba(48, 200, 255, 0.12);
}

.parking-score-chart__gran-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.parking-score-chart__main {
  position: relative;
  flex: 1;
  min-height: 0;
}

.parking-score-chart__echart {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.parking-score-chart__state {
  margin: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: rgba(160, 210, 230, 0.55);
}

.parking-score-chart__state.is-error {
  color: rgba(248, 113, 113, 0.85);
}

.parking-score-chart__loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(4, 14, 28, 0.25);
  pointer-events: none;
}

.parking-score-chart__summary {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  padding: 2px 4px 0;
}

.parking-score-chart__metric {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(92, 232, 255, 0.95);
}

.parking-score-chart__metric em {
  margin-right: 6px;
  font-style: normal;
  font-size: 10px;
  color: rgba(140, 185, 205, 0.55);
}

.parking-score-chart__metric.is-avg {
  color: rgba(232, 200, 74, 0.95);
}
</style>
