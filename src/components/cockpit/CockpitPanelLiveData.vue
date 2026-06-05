<!-- 通用面板数据展示：对接 GET /api/cockpit/v1/panels/{panelKey} -->
<script setup lang="ts">
import { getCockpitPanel } from '@/api/cockpit-panels'
import type { CockpitPanelKey } from '@/types/cockpit'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  panelKey: CockpitPanelKey
  activeTab: string
  useMock?: boolean
  refreshMs?: number
}>()

const panelData = ref<Awaited<ReturnType<typeof getCockpitPanel>> | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

let refreshTimer: number | null = null

const loadPanel = async () => {
  if (props.useMock) {
    panelData.value = null
    loadError.value = null
    return
  }
  loading.value = true
  loadError.value = null
  try {
    panelData.value = await getCockpitPanel(props.panelKey)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
    panelData.value = null
  } finally {
    loading.value = false
  }
}

const startRefresh = () => {
  stopRefresh()
  const ms = props.refreshMs ?? 5_000
  if (ms > 0 && !props.useMock) {
    refreshTimer = window.setInterval(() => {
      void loadPanel()
    }, ms)
  }
}

const stopRefresh = () => {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

watch(
  () => [props.panelKey, props.useMock] as const,
  () => {
    void loadPanel()
    startRefresh()
  },
  { immediate: true },
)

const activeChart = computed(() => panelData.value?.charts?.[props.activeTab])
const summaryEntries = computed(() => {
  const summary = panelData.value?.summary
  if (!summary || typeof summary !== 'object') return []
  return Object.entries(summary as Record<string, unknown>).slice(0, 6)
})
</script>

<template>
  <div class="panel-live">
    <p v-if="useMock" class="panel-live__state">Mock 模式未接面板接口</p>
    <p v-else-if="loadError" class="panel-live__state is-error">{{ loadError }}</p>
    <p v-else-if="loading && !panelData" class="panel-live__state">加载中…</p>
    <template v-else-if="panelData">
      <div v-if="summaryEntries.length" class="panel-live__summary">
        <div v-for="[key, val] in summaryEntries" :key="key" class="panel-live__metric">
          <em>{{ key }}</em>
          <span>{{ val }}</span>
        </div>
      </div>
      <pre v-if="activeChart" class="panel-live__chart">{{ JSON.stringify(activeChart, null, 2) }}</pre>
      <p v-else class="panel-live__state">当前 Tab 暂无图表数据</p>
      <p v-if="panelData.updatedAt" class="panel-live__updated">更新：{{ panelData.updatedAt }}</p>
    </template>
  </div>
</template>

<style scoped>
.panel-live {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 120px;
  overflow: auto;
}

.panel-live__state {
  margin: 0;
  font-size: 12px;
  color: rgba(180, 220, 240, 0.7);
  text-align: center;
  padding: 12px 8px;
}

.panel-live__state.is-error {
  color: #ff9b9b;
}

.panel-live__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.panel-live__metric {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.12);
  background: rgba(4, 12, 22, 0.45);
  font-size: 11px;
  color: #5ce8ff;
}

.panel-live__metric em {
  display: block;
  font-style: normal;
  color: rgba(160, 200, 220, 0.7);
  margin-bottom: 2px;
}

.panel-live__chart {
  margin: 0;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid rgba(48, 220, 255, 0.1);
  background: rgba(2, 10, 20, 0.5);
  font-size: 10px;
  line-height: 1.4;
  color: rgba(200, 238, 252, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
  min-height: 80px;
  overflow: auto;
}

.panel-live__updated {
  margin: 0;
  font-size: 10px;
  color: rgba(140, 185, 205, 0.55);
  text-align: right;
}
</style>
