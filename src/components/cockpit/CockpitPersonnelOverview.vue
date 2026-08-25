<script setup lang="ts">
import { getPersonnelSummary } from '@/api/personnel-access'
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import PersonnelMatterStatsChart from '@/components/cockpit/PersonnelMatterStatsChart.vue'
import PersonnelRegionStatsChart from '@/components/cockpit/PersonnelRegionStatsChart.vue'
import PersonnelTimeStatsChart from '@/components/cockpit/PersonnelTimeStatsChart.vue'
import { personnelOverviewTabs } from '@/config/cockpit'
import type { PersonnelAccessGranularity, PersonnelSummaryData } from '@/types/personnel-access'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const granularity = ref<PersonnelAccessGranularity>('day')
const summary = ref<PersonnelSummaryData | null>(null)
const summaryError = ref('')
const refreshToken = ref(0)
let eventSource: EventSource | null = null
let refreshTimer: number | null = null
let eventRefreshTimer: number | null = null

const loadSummary = async () => {
  try {
    summary.value = await getPersonnelSummary()
    summaryError.value = ''
  } catch (error) {
    summaryError.value = error instanceof Error ? error.message : String(error)
  }
}

const refreshAll = () => {
  void loadSummary()
  refreshToken.value += 1
}

const stopPolling = () => {
  if (refreshTimer === null) return
  window.clearInterval(refreshTimer)
  refreshTimer = null
}

const startPolling = () => {
  if (refreshTimer !== null) return
  refreshTimer = window.setInterval(refreshAll, 30_000)
}

const scheduleRealtimeRefresh = () => {
  if (eventRefreshTimer !== null) return
  eventRefreshTimer = window.setTimeout(() => {
    eventRefreshTimer = null
    refreshAll()
  }, 1_000)
}

onMounted(() => {
  refreshAll()
  startPolling()
  eventSource = new EventSource('/api/public/realtime/stream')
  ;['personnel.event', 'personnel.stats', 'personnel.device'].forEach((eventName) => {
    eventSource?.addEventListener(eventName, scheduleRealtimeRefresh)
  })
  eventSource.addEventListener('open', stopPolling)
  eventSource.addEventListener('error', startPolling)
})

onBeforeUnmount(() => {
  eventSource?.close()
  stopPolling()
  if (eventRefreshTimer !== null) window.clearTimeout(eventRefreshTimer)
})
</script>

<template>
  <CockpitPanelTabs :tabs="personnelOverviewTabs" ariaLabel="人员进出概况" :bodyMinHeight="200">
    <template #default="{ activeTab }">
      <div class="personnel-overview">
        <div class="personnel-overview__summary" :title="summaryError || summary?.message">
          <span class="personnel-overview__metric">
            <em>人员</em><strong>{{ summary?.staffCount ?? '--' }}</strong>
          </span>
          <span class="personnel-overview__metric">
            <em>在线设备</em><strong>{{ summary?.onlineDeviceCount ?? '--' }}</strong>
          </span>
          <span class="personnel-overview__metric">
            <em>今日通行</em><strong>{{ summary?.todayPassCount ?? '--' }}</strong>
          </span>
          <span v-if="summary?.stale" class="personnel-overview__stale">数据延迟</span>
          <span v-else-if="summaryError && !summary" class="personnel-overview__stale">
            数据暂不可用
          </span>
        </div>

        <div class="personnel-overview__chart">
          <PersonnelRegionStatsChart
            v-if="activeTab === 'region'"
            :key="`region-${refreshToken}`"
            v-model:granularity="granularity"
          />
          <PersonnelMatterStatsChart
            v-else-if="activeTab === 'matter'"
            :key="`matter-${refreshToken}`"
            v-model:granularity="granularity"
          />
          <PersonnelTimeStatsChart
            v-else-if="activeTab === 'time'"
            :key="`time-${refreshToken}`"
            v-model:granularity="granularity"
          />
        </div>
      </div>
    </template>
  </CockpitPanelTabs>
</template>

<style scoped>
.personnel-overview {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 5px;
}

.personnel-overview__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  align-items: center;
  min-height: 26px;
  padding: 3px 6px;
  border: 1px solid rgba(48, 220, 255, 0.12);
  border-radius: 4px;
  background: rgba(4, 16, 28, 0.56);
}

.personnel-overview__metric {
  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  font-variant-numeric: tabular-nums;
}

.personnel-overview__metric em {
  font-style: normal;
  font-size: 9px;
  color: rgba(148, 198, 218, 0.68);
}

.personnel-overview__metric strong {
  font-size: 13px;
  font-weight: 700;
  color: #baf5ff;
}

.personnel-overview__stale {
  padding-left: 6px;
  font-size: 9px;
  color: #f7c65b;
  white-space: nowrap;
}

.personnel-overview__chart {
  flex: 1;
  min-height: 0;
}
</style>
