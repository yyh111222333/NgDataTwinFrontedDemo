<!-- 大屏视图入口：编排页面状态并组合各 cockpit 子组件。 -->
<script setup lang="ts">
import CockpitBottomNav from '@/components/cockpit/CockpitBottomNav.vue'
import CockpitQuickAppointment from '@/components/cockpit/CockpitQuickAppointment.vue'
import CockpitDebugPanel from '@/components/cockpit/CockpitDebugPanel.vue'
import CockpitHeader from '@/components/cockpit/CockpitHeader.vue'
import CockpitKpiStats from '@/components/cockpit/CockpitKpiStats.vue'
import CockpitDrivingMonitorOverview from '@/components/cockpit/CockpitDrivingMonitorOverview.vue'
import CockpitSmartMonitorOverview from '@/components/cockpit/CockpitSmartMonitorOverview.vue'
import CockpitVehicleOverview from '@/components/cockpit/CockpitVehicleOverview.vue'
import CockpitPersonnelOverview from '@/components/cockpit/CockpitPersonnelOverview.vue'
import CockpitSceneMount from '@/components/cockpit/CockpitSceneMount.vue'
import CockpitSidePanels from '@/components/cockpit/CockpitSidePanels.vue'
import { getDashboardOverview, getDeviceStatusOptions } from '@/api/dashboard'
import { useBackendHealth } from '@/composables/useBackendHealth'
import { useCockpitDoorSignals } from '@/composables/useCockpitDoorSignals'
import { useGateAccessEvents } from '@/composables/useGateAccessEvents'
import { useRelayDoorStatus } from '@/composables/useRelayDoorStatus'
import {
  DASHBOARD_DEVICE_REGIONS,
  DASHBOARD_DEVICE_TYPES,
} from '@/config/device-status-catalog'
import { buildDeviceStatusRecords } from '@/mocks/device-status-inventory'
import { appendGateAccessEventMock, resetGateAccessEventsMock } from '@/mocks/gate-access-events'
import {
  bottomMenus,
  middleStats,
  panels,
} from '@/config/cockpit'
import CockpitShell from '@/layouts/CockpitShell.vue'
import plantMapSvgRaw from '@/assets/厂区地图_画板 1.svg?raw'
import { extractSceneDoorIds } from '@/components/cockpit/sceneMount/sceneDoorIds'
import { applyGateAccessEvents } from '@/utils/apply-gate-access-event'
import type { DoorFlowDirection } from '@/types/door'
import type { CockpitDoorSignal } from '@/types/cockpit-door-signal'
import type { GateAccessEvent } from '@/types/gate-access'
import type { RelayDoorStatusSnapshot } from '@/types/relay-door-status'
import type {
  DashboardDeviceRecord,
  DashboardOverviewData,
  DeviceStatusOption,
  DeviceStatusOptionsData,
  RailStatus,
} from '@/types/dashboard'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const { backendOnline, healthError } = useBackendHealth()
const router = useRouter()

const SCENE_DOOR_IDS = extractSceneDoorIds(plantMapSvgRaw)
const VALID_DOOR_IDS = new Set(SCENE_DOOR_IDS)
const DEFAULT_DOOR_ID = SCENE_DOOR_IDS[0] ?? ''
const createDoorStateMap = (value: boolean) =>
  Object.fromEntries(SCENE_DOOR_IDS.map((id) => [id, value])) as Record<string, boolean>
const createDoorFlowDirectionMap = (value: DoorFlowDirection) =>
  Object.fromEntries(SCENE_DOOR_IDS.map((id) => [id, value])) as Record<string, DoorFlowDirection>

const leftPanels = panels.filter((panel) => panel.side === 'left')
const rightPanels = panels.filter((panel) => panel.side === 'right')

const dateText = ref('')
const timeText = ref('')
const weekText = ref('')
const showDebugPanel = ref(false)
const gateAccessPolling = ref(false)
const gateAccessUseMock = ref(true)
const gateAccessCursor = ref<string | undefined>(undefined)
const gateAccessError = ref<string | null>(null)
const recentGateEvents = ref<GateAccessEvent[]>([])
const doorSignalRevisions = ref<Record<string, number>>({})
const sceneMountRef = ref<InstanceType<typeof CockpitSceneMount> | null>(null)
const dataSource = ref<'mock' | 'api'>('mock')
const apiLoading = ref(false)
const apiError = ref<string | null>(null)
const mockRefreshTick = ref(0)

type DashboardViewState = {
  onlineAccess: number
  areaTotal: number
  vehiclesOnSite: number
  railStatus: RailStatus
  alarmCount: number
  selectedDoorId: string
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
  deviceRegions: string[]
  deviceTypes: string[]
  deviceRecords: DashboardDeviceRecord[]
}

const INITIAL_DEVICE_REGIONS: string[] = [...DASHBOARD_DEVICE_REGIONS]
const INITIAL_DEVICE_TYPES: string[] = [...DASHBOARD_DEVICE_TYPES]

const buildInitialRecords = () => buildDeviceStatusRecords(0)

const createInitialState = (): DashboardViewState => ({
  onlineAccess: Number(middleStats[0]?.value ?? 0),
  areaTotal: Number(middleStats[1]?.value ?? 0),
  vehiclesOnSite: Number(middleStats[2]?.value ?? 0),
  railStatus: middleStats[3]?.value === '占用' ? '占用' : '空闲',
  alarmCount: 0,
  selectedDoorId: DEFAULT_DOOR_ID,
  doorStates: createDoorStateMap(false),
  doorFlowDirections: createDoorFlowDirectionMap('out'),
  deviceRegions: [...INITIAL_DEVICE_REGIONS],
  deviceTypes: [...INITIAL_DEVICE_TYPES],
  deviceRecords: buildInitialRecords(),
})

// 深拷贝视图状态，避免 mock/current 共用引用导致串改。
const cloneState = (state: DashboardViewState): DashboardViewState => ({
  onlineAccess: state.onlineAccess,
  areaTotal: state.areaTotal,
  vehiclesOnSite: state.vehiclesOnSite,
  railStatus: state.railStatus,
  alarmCount: state.alarmCount,
  selectedDoorId: state.selectedDoorId,
  doorStates: { ...state.doorStates },
  doorFlowDirections: { ...state.doorFlowDirections },
  deviceRegions: [...state.deviceRegions],
  deviceTypes: [...state.deviceTypes],
  deviceRecords: state.deviceRecords.map((it) => ({ ...it })),
})

const currentState = ref<DashboardViewState>(createInitialState())
const mockState = ref<DashboardViewState>(createInitialState())

const runtimeKpiStats = computed(() => [
  { value: String(currentState.value.onlineAccess), label: '在线门禁' },
  { value: String(currentState.value.areaTotal), label: '区域总人数' },
  { value: String(currentState.value.vehiclesOnSite), label: '车辆在场' },
  { value: currentState.value.railStatus, label: '火车道状态' },
  { value: String(currentState.value.alarmCount), label: '异常警告' },
])

const regionOptions = ref<DeviceStatusOption[]>([])
const deviceOptions = ref<DeviceStatusOption[]>([])
const selectedRegionId = ref('all')
const selectedDeviceType = ref('all')

const applyOverviewData = (data: DashboardOverviewData) => {
  currentState.value = {
    onlineAccess: data.onlineAccess,
    areaTotal: data.areaTotal,
    vehiclesOnSite: data.vehiclesOnSite,
    railStatus: data.railStatus,
    alarmCount: data.alarmCount,
    selectedDoorId: currentState.value.selectedDoorId,
    doorStates: { ...currentState.value.doorStates },
    doorFlowDirections: { ...currentState.value.doorFlowDirections },
    deviceRegions: [...data.deviceRegions],
    deviceTypes: [...data.deviceTypes],
    deviceRecords: data.deviceRecords.map((r) => ({ ...r })),
  }
}

const projectMockToCurrent = () => {
  currentState.value = cloneState(mockState.value)
}

const withAllOption = (items: DeviceStatusOption[]) => {
  const allExists = items.some((it) => it.id === 'all')
  if (allExists) return items
  return [{ id: 'all', name: '全部' }, ...items]
}

const applyOptionsData = (data: DeviceStatusOptionsData) => {
  const regionNames =
    currentState.value.deviceRegions.length > 0
      ? currentState.value.deviceRegions
      : [...DASHBOARD_DEVICE_REGIONS]
  regionOptions.value = withAllOption(regionNames.map((name) => ({ id: name, name })))
  deviceOptions.value = withAllOption(data.deviceTypes)
}

const initMockOptions = () => {
  regionOptions.value = [{ id: 'all', name: '全部' }, ...mockState.value.deviceRegions.map((name) => ({ id: name, name }))]
  deviceOptions.value = [{ id: 'all', name: '全部' }, ...mockState.value.deviceTypes.map((name) => ({ id: name, name }))]
  selectedRegionId.value = 'all'
  selectedDeviceType.value = 'all'
}

const loadDeviceStatusOptions = async (regionId: string) => {
  apiError.value = null
  try {
    const data = await getDeviceStatusOptions(regionId, {
      useMock: dataSource.value === 'mock',
    })
    applyOptionsData(data)
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : String(e)
  }
}

const loadDashboardOverview = async () => {
  apiLoading.value = true
  apiError.value = null
  try {
    const useMock = dataSource.value === 'mock'
    const data = await getDashboardOverview({
      useMock,
      mockTick: useMock ? mockRefreshTick.value : undefined,
    })
    applyOverviewData(data)
    if (useMock) {
      mockRefreshTick.value += 1
    }
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : String(e)
  } finally {
    apiLoading.value = false
  }
}

let overviewRefreshTimer: number | null = null

const startOverviewAutoRefresh = () => {
  if (overviewRefreshTimer !== null) return
  overviewRefreshTimer = window.setInterval(() => {
    void loadDashboardOverview()
  }, 30_000)
}

const stopOverviewAutoRefresh = () => {
  if (overviewRefreshTimer !== null) {
    window.clearInterval(overviewRefreshTimer)
    overviewRefreshTimer = null
  }
}

const bootstrapOverview = async () => {
  selectedRegionId.value = 'all'
  selectedDeviceType.value = 'all'
  await loadDeviceStatusOptions('all')
  await loadDashboardOverview()
  startOverviewAutoRefresh()
}

const handleRegionChange = async (newRegionId: string) => {
  selectedRegionId.value = newRegionId
  selectedDeviceType.value = 'all'
  if (dataSource.value === 'api') {
    await loadDeviceStatusOptions(newRegionId)
    await loadDashboardOverview()
  } else {
    await loadDeviceStatusOptions(newRegionId)
  }
}

const handleDeviceChange = async (_newDeviceType: string) => {
  if (dataSource.value !== 'api') return
  await loadDashboardOverview()
}

watch(
  dataSource,
  (mode, prev) => {
    stopOverviewAutoRefresh()
    mockRefreshTick.value = 0
    if (mode === 'mock' && prev === 'api') {
      projectMockToCurrent()
    }
    void bootstrapOverview()
  },
  { immediate: true },
)

let clockTimer: number | null = null
let debugKeyHandler: ((e: KeyboardEvent) => void) | null = null

const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

const pad2 = (num: number) => String(num).padStart(2, '0')

const updateClock = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = pad2(now.getMonth() + 1)
  const day = pad2(now.getDate())
  const hour = pad2(now.getHours())
  const minute = pad2(now.getMinutes())
  const second = pad2(now.getSeconds())

  dateText.value = `${year}-${month}-${day}`
  timeText.value = `${hour}:${minute}:${second}`
  weekText.value = weekMap[now.getDay()] ?? '星期日'
}

onMounted(() => {
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  debugKeyHandler = (e: KeyboardEvent) => {
    const byF8 = e.key === 'F8'
    if (byF8) {
      e.preventDefault()
      showDebugPanel.value = !showDebugPanel.value
    }
  }
  window.addEventListener('keydown', debugKeyHandler)
})

onBeforeUnmount(() => {
  if (clockTimer !== null) {
    window.clearInterval(clockTimer)
  }
  if (debugKeyHandler) {
    window.removeEventListener('keydown', debugKeyHandler)
    debugKeyHandler = null
  }
  stopOverviewAutoRefresh()
})

const activeMenu = ref<string | null>(null)

const handleBottomMenuClick = (item: (typeof bottomMenus)[number]) => {
  activeMenu.value = item.label
  void router.push({ name: 'subsystem', params: { id: item.id } })
}

const handleMockOnlineAccessUpdate = (value: number) => {
  if (dataSource.value === 'api') return
  mockState.value = { ...mockState.value, onlineAccess: value }
  projectMockToCurrent()
}

const handleMockAreaTotalUpdate = (value: number) => {
  if (dataSource.value === 'api') return
  mockState.value = { ...mockState.value, areaTotal: value }
  projectMockToCurrent()
}

const handleMockVehiclesOnSiteUpdate = (value: number) => {
  if (dataSource.value === 'api') return
  mockState.value = { ...mockState.value, vehiclesOnSite: value }
  projectMockToCurrent()
}

const handleMockRailStatusUpdate = (value: RailStatus) => {
  if (dataSource.value === 'api') return
  mockState.value = { ...mockState.value, railStatus: value }
  projectMockToCurrent()
}

const handleMockSelectedDoorUpdate = (value: string) => {
  mockState.value = { ...mockState.value, selectedDoorId: value }
  projectMockToCurrent()
}

const handleTriggerSelectedDoorAnimation = () => {
  const doorId = mockState.value.selectedDoorId
  if (!doorId) return
  mockState.value = {
    ...mockState.value,
    doorStates: {
      ...mockState.value.doorStates,
      [doorId]: !mockState.value.doorStates[doorId],
    },
  }
  projectMockToCurrent()
}

const handleToggleSelectedDoorFlowDirection = () => {
  const doorId = mockState.value.selectedDoorId
  if (!doorId) return
  const current = mockState.value.doorFlowDirections[doorId] ?? 'out'
  mockState.value = {
    ...mockState.value,
    doorFlowDirections: {
      ...mockState.value.doorFlowDirections,
      [doorId]: current === 'out' ? 'in' : 'out',
    },
  }
  projectMockToCurrent()
}

const handleTriggerAllDoorAnimations = () => {
  const batchDirection =
    mockState.value.doorFlowDirections[mockState.value.selectedDoorId] ?? 'out'
  const nextFlowDirections = Object.fromEntries(
    SCENE_DOOR_IDS.map((id) => [id, batchDirection]),
  ) as Record<string, DoorFlowDirection>
  const nextStates = { ...mockState.value.doorStates }
  SCENE_DOOR_IDS.forEach((id) => {
    nextStates[id] = !nextStates[id]
  })
  mockState.value = {
    ...mockState.value,
    doorFlowDirections: nextFlowDirections,
    doorStates: nextStates,
  }
  projectMockToCurrent()
}

const MAX_RECENT_GATE_EVENTS = 30

const appendRecentGateEvents = (events: GateAccessEvent[]) => {
  if (events.length === 0) return
  recentGateEvents.value = [...events, ...recentGateEvents.value].slice(0, MAX_RECENT_GATE_EVENTS)
}

const mergeRelayDoorSnapshot = (
  state: DashboardViewState,
  snapshot: RelayDoorStatusSnapshot,
): DashboardViewState => ({
  ...state,
  doorStates: {
    ...state.doorStates,
    ...snapshot.doorStates,
  },
  doorFlowDirections: {
    ...state.doorFlowDirections,
    ...snapshot.doorFlowDirections,
  },
})

const applyRelayDoorStatus = (snapshot: RelayDoorStatusSnapshot) => {
  currentState.value = mergeRelayDoorSnapshot(currentState.value, snapshot)
  if (dataSource.value === 'mock') {
    mockState.value = mergeRelayDoorSnapshot(mockState.value, snapshot)
  }
  appendRecentGateEvents(snapshot.events)
}

const applyCockpitDoorSignals = (signals: CockpitDoorSignal[]) => {
  if (signals.length === 0) return

  const doorStates = { ...currentState.value.doorStates }
  const doorFlowDirections = { ...currentState.value.doorFlowDirections }
  const revisions = { ...doorSignalRevisions.value }
  const events: GateAccessEvent[] = []

  signals.forEach((signal) => {
    doorStates[signal.doorId] = signal.open
    doorFlowDirections[signal.doorId] = signal.direction
    revisions[signal.doorId] = (revisions[signal.doorId] ?? 0) + 1
    if (!signal.silent) {
      events.push({
        eventId: `cockpit_${signal.sourceDoorId}_${signal.version}`,
        doorId: signal.doorId,
        direction: signal.direction,
        occurredAt: signal.occurredAt || new Date().toISOString(),
      })
    }
  })

  currentState.value = { ...currentState.value, doorStates, doorFlowDirections }
  if (dataSource.value === 'mock') {
    mockState.value = { ...mockState.value, doorStates, doorFlowDirections }
  }
  doorSignalRevisions.value = revisions
  appendRecentGateEvents(events)
  gateAccessError.value = null
}

const VEHICLE_BARRIER_DEMO_DOOR_IDS = [
  'vehicleBarrier_07',
  'vehicleBarrier_8',
  'vehicleBarrier_10',
] as const
let barrierDemoOpenTimer: number | null = null
let barrierDemoCloseTimer: number | null = null

const triggerVehicleBarrierDemoFromQuery = () => {
  const demo = new URLSearchParams(window.location.search).get('demo')
  if (demo !== 'barriers') return

  barrierDemoOpenTimer = window.setTimeout(() => {
    const occurredAt = new Date().toISOString()
    const demoVersion = `demo_${Date.now()}`
    const openSignals: CockpitDoorSignal[] = VEHICLE_BARRIER_DEMO_DOOR_IDS.map((doorId) => ({
      sourceDoorId: `demo:${doorId}`,
      doorId,
      open: true,
      direction: 'in',
      occurredAt,
      version: demoVersion,
      silent: true,
    }))
    applyCockpitDoorSignals(openSignals)

    barrierDemoCloseTimer = window.setTimeout(() => {
      applyCockpitDoorSignals(
        openSignals.map((signal) => ({
          ...signal,
          open: false,
          version: `${signal.version}|reset`,
        })),
      )
    }, 2_500)
  }, 1_500)
}

onMounted(triggerVehicleBarrierDemoFromQuery)
onBeforeUnmount(() => {
  if (barrierDemoOpenTimer !== null) window.clearTimeout(barrierDemoOpenTimer)
  if (barrierDemoCloseTimer !== null) window.clearTimeout(barrierDemoCloseTimer)
})

const applyIncomingGateEvents = (events: GateAccessEvent[]) => {
  if (events.length === 0) return
  const slice = applyGateAccessEvents(
    {
      doorStates: mockState.value.doorStates,
      doorFlowDirections: mockState.value.doorFlowDirections,
    },
    events,
    VALID_DOOR_IDS,
  )
  const lastEvent = events[events.length - 1]
  mockState.value = {
    ...mockState.value,
    selectedDoorId: lastEvent?.doorId ?? mockState.value.selectedDoorId,
    doorStates: slice.doorStates,
    doorFlowDirections: slice.doorFlowDirections,
  }
  projectMockToCurrent()
  appendRecentGateEvents(events)
}

const handleSimulateGatePass = () => {
  gateAccessError.value = null
  const doorId = mockState.value.selectedDoorId
  if (!doorId) return
  const direction = mockState.value.doorFlowDirections[doorId] ?? 'out'
  const event =
    gateAccessUseMock.value
      ? appendGateAccessEventMock(doorId, direction)
      : ({
          eventId: `manual_${Date.now()}`,
          doorId,
          direction,
          occurredAt: new Date().toISOString(),
        } satisfies GateAccessEvent)
  applyIncomingGateEvents([event])
  gateAccessCursor.value = event.eventId
}

const handleClearGateEvents = () => {
  recentGateEvents.value = []
  gateAccessCursor.value = undefined
  gateAccessError.value = null
  if (gateAccessUseMock.value) {
    resetGateAccessEventsMock()
  }
}

watch(showDebugPanel, (visible) => {
  if (!visible) {
    gateAccessPolling.value = false
  }
})

useRelayDoorStatus({
  enabled: computed(() => true),
  validDoorIds: VALID_DOOR_IDS,
  onUpdate: applyRelayDoorStatus,
  onError: (error) => {
    apiError.value = error instanceof Error ? error.message : String(error)
  },
})

useCockpitDoorSignals({
  enabled: computed(() => true),
  validDoorIds: VALID_DOOR_IDS,
  onSignals: applyCockpitDoorSignals,
  onError: (error) => {
    gateAccessError.value = error instanceof Error ? error.message : String(error)
  },
})

useGateAccessEvents({
  enabled: computed(() => showDebugPanel.value && gateAccessPolling.value),
  useMock: gateAccessUseMock,
  animatableDoorIds: SCENE_DOOR_IDS,
  validDoorIds: VALID_DOOR_IDS,
  cursor: gateAccessCursor,
  onEvents: applyIncomingGateEvents,
  onError: (error) => {
    gateAccessError.value = error instanceof Error ? error.message : String(error)
  },
})
</script>

<template>
  <CockpitShell>
    <div class="cockpit">
      <CockpitSceneMount
        ref="sceneMountRef"
        :door-states="currentState.doorStates"
        :door-flow-directions="currentState.doorFlowDirections"
        :door-signal-revisions="doorSignalRevisions"
      />
      <CockpitHeader
        :date-text="dateText"
        :time-text="timeText"
        :week-text="weekText"
        :backend-online="backendOnline"
        :backend-health-hint="healthError"
      />

      <div class="cockpit__main">
        <CockpitSidePanels :left-panels="leftPanels" :right-panels="rightPanels">
          <template #left-overview>
            <CockpitKpiStats :items="runtimeKpiStats" />
          </template>
          <template #left-device>
            <CockpitPersonnelOverview />
          </template>
          <template #left-stat>
            <CockpitVehicleOverview />
          </template>
          <template #right-list>
            <CockpitDrivingMonitorOverview />
          </template>
          <template #right-risk>
            <CockpitSmartMonitorOverview
              :device-records="currentState.deviceRecords"
              :region-options="regionOptions"
              :device-options="deviceOptions"
              :selected-region-id="selectedRegionId"
              :selected-device-type="selectedDeviceType"
              @update:selected-region-id="selectedRegionId = $event"
              @update:selected-device-type="selectedDeviceType = $event"
              @region-change="handleRegionChange"
              @device-change="handleDeviceChange"
            />
          </template>
          <template #right-board>
            <CockpitQuickAppointment />
          </template>
        </CockpitSidePanels>

        <div class="cockpit__bottom-bar">
          <CockpitBottomNav
            :menus="bottomMenus"
            :active-menu="activeMenu"
            @menu-click="handleBottomMenuClick"
          />
        </div>

      </div>

      <!-- 置于 main 外，避免 pointer-events:none 与顶栏 z-index 遮挡 -->
      <CockpitDebugPanel
        :visible="showDebugPanel"
        :door-ids="SCENE_DOOR_IDS"
        :animation-ready-count="sceneMountRef?.boundGateCount ?? 0"
        :selected-door-id="currentState.selectedDoorId"
        :selected-door-open="currentState.doorStates[currentState.selectedDoorId] ?? false"
        :selected-door-flow-direction="currentState.doorFlowDirections[currentState.selectedDoorId] ?? 'out'"
        :gate-access-polling="gateAccessPolling"
        :gate-access-use-mock="gateAccessUseMock"
        :gate-access-cursor="gateAccessCursor ?? ''"
        :gate-access-error="gateAccessError"
        :recent-gate-events="recentGateEvents"
        @update:selected-door-id="handleMockSelectedDoorUpdate"
        @trigger-animation="handleTriggerSelectedDoorAnimation"
        @toggle-flow-direction="handleToggleSelectedDoorFlowDirection"
        @open-all="handleTriggerAllDoorAnimations"
        @update:gate-access-polling="gateAccessPolling = $event"
        @update:gate-access-use-mock="gateAccessUseMock = $event"
        @simulate-gate-pass="handleSimulateGatePass"
        @clear-gate-events="handleClearGateEvents"
      />
    </div>
  </CockpitShell>
</template>

<style scoped>
.cockpit {
  --cockpit-sidebar-w: 400px;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.cockpit__main {
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: var(--cockpit-sidebar-w) 1fr var(--cockpit-sidebar-w);
  grid-template-rows: 1fr;
  pointer-events: none;
}

.cockpit__bottom-bar {
  grid-column: 2;
  grid-row: 1;
  align-self: end;
  justify-self: stretch;
  width: 100%;
  padding-bottom: 4px;
  box-sizing: border-box;
  z-index: 4;
  pointer-events: none;
}

.cockpit__bottom-bar :deep(.cockpit-bottom-nav) {
  pointer-events: all;
}
</style>
