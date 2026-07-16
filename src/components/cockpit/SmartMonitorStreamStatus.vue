<script setup lang="ts">
import { getSmartMonitorDashboard } from '@/api/smart-monitor-dashboard'
import type { SmartMonitorDashboardData } from '@/types/smart-monitor-dashboard'
import { PieChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'

use([PieChart, TooltipComponent, CanvasRenderer])

const dashboard = ref<SmartMonitorDashboardData | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const loadStatus = async () => {
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
  void loadStatus()
  refreshTimer = window.setInterval(() => void loadStatus(), 30_000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
})

const summary = computed(() => {
  const total = dashboard.value?.streamTotalCount ?? 0
  const online = Math.min(total, dashboard.value?.streamOnlineCount ?? 0)
  return { total, online, offline: Math.max(0, total - online) }
})

const pieOption = computed(() => ({
  backgroundColor: 'transparent',
  animationDuration: 720,
  tooltip: {
    trigger: 'item',
    confine: true,
    backgroundColor: 'rgba(4, 14, 28, 0.92)',
    borderColor: 'rgba(92, 232, 255, 0.45)',
    borderWidth: 1,
    textStyle: { color: '#e8fbff', fontSize: 12 },
    formatter: (item: { name: string; value: number; percent: number }) =>
      `${item.name}<br/>${item.value} 路 · ${item.percent.toFixed(1)}%`,
  },
  graphic: [
    {
      type: 'text',
      left: 'center',
      top: '40%',
      style: {
        text: String(summary.value.online),
        fill: '#e8fbff',
        fontSize: 28,
        fontWeight: 700,
        textAlign: 'center',
      },
    },
    {
      type: 'text',
      left: 'center',
      top: '57%',
      style: {
        text: '在线',
        fill: 'rgba(160, 205, 225, 0.7)',
        fontSize: 10,
        textAlign: 'center',
      },
    },
  ],
  series: [
    {
      type: 'pie',
      radius: ['52%', '72%'],
      center: ['50%', '50%'],
      silent: summary.value.total <= 0,
      avoidLabelOverlap: true,
      padAngle: 2,
      label: { show: false },
      labelLine: { show: false },
      itemStyle: {
        borderRadius: 4,
        borderColor: 'rgba(4, 18, 32, 0.9)',
        borderWidth: 2,
      },
      data:
        summary.value.total > 0
          ? [
              {
                name: '在线',
                value: summary.value.online,
                itemStyle: { color: '#55ef96', shadowBlur: 12, shadowColor: '#55ef9666' },
              },
              {
                name: '离线',
                value: summary.value.offline,
                itemStyle: { color: '#ff6b6b', shadowBlur: 12, shadowColor: '#ff6b6b66' },
              },
            ]
          : [{ name: '暂无数据', value: 1, itemStyle: { color: 'rgba(120, 160, 180, 0.18)' } }],
    },
  ],
}))
</script>

<template>
  <div class="stream-status">
    <div class="stream-status__header">
      <span class="stream-status__source"><i aria-hidden="true" />智慧监控子系统</span>
      <span class="stream-status__refresh" :class="{ 'is-loading': loading }">
        {{ loading ? '同步中' : '实时接入' }}
      </span>
    </div>

    <p v-if="loadError && !dashboard" class="stream-status__state is-error">{{ loadError }}</p>
    <div v-else class="stream-status__body">
      <VChart class="stream-status__chart" :option="pieOption" autoresize />
      <div class="stream-status__metrics">
        <div class="stream-status__metric is-total">
          <span>接入视频</span>
          <strong>{{ summary.total }}<em>路</em></strong>
        </div>
        <div class="stream-status__metric is-online">
          <span>视频在线</span>
          <strong>{{ summary.online }}<em>路</em></strong>
        </div>
        <div class="stream-status__metric is-offline">
          <span>视频离线</span>
          <strong>{{ summary.offline }}<em>路</em></strong>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stream-status {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.stream-status__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 2px 4px 0;
}

.stream-status__source {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(210, 245, 255, 0.9);
  font-size: 11px;
  font-weight: 600;
}

.stream-status__source i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #55ef96;
  box-shadow: 0 0 8px rgba(85, 239, 150, 0.75);
}

.stream-status__refresh {
  color: rgba(85, 239, 150, 0.75);
  font-size: 10px;
}

.stream-status__refresh.is-loading {
  color: rgba(92, 232, 255, 0.78);
}

.stream-status__body {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(118px, 0.82fr);
  align-items: center;
  flex: 1;
  min-height: 0;
  gap: 8px;
}

.stream-status__chart {
  width: 100%;
  height: 100%;
  min-height: 124px;
}

.stream-status__metrics {
  display: grid;
  gap: 5px;
  padding-right: 4px;
}

.stream-status__metric {
  box-sizing: border-box;
  height: 38px;
  min-height: 0;
  padding: 3px 7px;
  border-left: 2px solid #5ce8ff;
  background: rgba(11, 43, 69, 0.7);
}

.stream-status__metric span {
  display: block;
  color: rgba(150, 195, 215, 0.68);
  font-size: 10px;
  line-height: 12px;
}

.stream-status__metric strong {
  display: block;
  margin-top: 1px;
  color: #e8fbff;
  font-size: 17px;
  line-height: 19px;
}

.stream-status__metric em {
  margin-left: 4px;
  color: rgba(150, 195, 215, 0.55);
  font-size: 9px;
  font-style: normal;
  font-weight: 400;
}

.stream-status__metric.is-online {
  border-left-color: #55ef96;
}

.stream-status__metric.is-online strong {
  color: #55ef96;
}

.stream-status__metric.is-offline {
  border-left-color: #ff6b6b;
}

.stream-status__metric.is-offline strong {
  color: #ff8b8b;
}

.stream-status__state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  margin: 0;
  color: rgba(160, 210, 230, 0.55);
  font-size: 11px;
}

.stream-status__state.is-error {
  color: rgba(248, 113, 113, 0.85);
}
</style>
