<!-- 人员进出概况：保持原有三栏样式，数据由 K30 实时接口填充。 -->
<script setup lang="ts">
import CockpitPanelTabs from '@/components/cockpit/CockpitPanelTabs.vue'
import PersonnelMatterStatsChart from '@/components/cockpit/PersonnelMatterStatsChart.vue'
import PersonnelRegionStatsChart from '@/components/cockpit/PersonnelRegionStatsChart.vue'
import PersonnelTimeStatsChart from '@/components/cockpit/PersonnelTimeStatsChart.vue'
import { personnelOverviewTabs } from '@/config/cockpit'
import type { PersonnelAccessGranularity } from '@/types/personnel-access'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const granularity = ref<PersonnelAccessGranularity>('day')
const refreshToken = ref(0)
let eventSource: EventSource | null = null
let refreshTimer: number | null = null
let eventRefreshTimer: number | null = null

const refreshAll = () => {
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
      <div v-else class="personnel-overview__placeholder">
        <p class="personnel-overview__placeholder-title">
          {{ personnelOverviewTabs.find((tab) => tab.key === activeTab)?.label }}
        </p>
        <span class="personnel-overview__placeholder-hint">图表数据待接入</span>
      </div>
    </template>
  </CockpitPanelTabs>
</template>

<style scoped>
.personnel-overview__placeholder {
  height: 100%;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.personnel-overview__placeholder-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(200, 238, 252, 0.75);
}

.personnel-overview__placeholder-hint {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: rgba(140, 185, 205, 0.45);
}
</style>
