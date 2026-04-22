<script setup lang="ts">
// 页面组装层：只负责拼装组件、管理页面级状态（时间、底部激活项、跳转）
import CockpitBottomNav from '@/components/cockpit/CockpitBottomNav.vue'
import CockpitDeviceStatus from '@/components/cockpit/CockpitDeviceStatus.vue'
import CockpitDebugPanel from '@/components/cockpit/CockpitDebugPanel.vue'
import CockpitHeader from '@/components/cockpit/CockpitHeader.vue'
import CockpitKpiStats from '@/components/cockpit/CockpitKpiStats.vue'
import CockpitSceneMount from '@/components/cockpit/CockpitSceneMount.vue'
import CockpitSidePanels from '@/components/cockpit/CockpitSidePanels.vue'
import { getDashboardOverview, getDeviceStatusOptions } from '@/api/dashboard'
import { useBackendHealth } from '@/composables/useBackendHealth'
import { bottomMenus, middleStats, panels } from '@/config/cockpit'
import CockpitShell from '@/layouts/CockpitShell.vue'
import type {
  DashboardDeviceRecord,
  DashboardOverviewData,
  DeviceStatusOption,
  DeviceStatusOptionsData,
  RailStatus,
} from '@/types/dashboard'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const { backendOnline, healthError } = useBackendHealth()

// 从统一配置里拆出左右两列，模板里直接使用
const leftPanels = panels.filter((panel) => panel.side === 'left')
const rightPanels = panels.filter((panel) => panel.side === 'right')

// 顶栏时间展示：日期、时分秒、星期
const dateText = ref('')
const timeText = ref('')
const weekText = ref('')
const showDebugPanel = ref(false)
const dataSource = ref<'mock' | 'api'>('mock')
const apiLoading = ref(false)
const apiError = ref<string | null>(null)

type DashboardViewState = {
  onlineAccess: number
  areaTotal: number
  vehiclesOnSite: number
  railStatus: RailStatus
  deviceRegions: string[]
  deviceTypes: string[]
  deviceRecords: DashboardDeviceRecord[]
}

const INITIAL_DEVICE_REGIONS: string[] = ['A区', 'F区', 'L区', '成品库', '火车道', '道路', '厂房', '作业区']
const INITIAL_DEVICE_TYPES: string[] = [
  '人员智能门/联锁门',
  '车辆识别与道闸',
  '火车道联动门',
  '摄像机',
  '声光报警',
  '光电报警',
  '烟感器',
  '温感器',
]

const buildInitialRecords = (regions: string[], devices: string[]) =>
  regions.flatMap((region) =>
    devices.map((device) => ({
      region,
      device,
      online: 8,
      offline: 1,
    })),
  )

const createInitialState = (): DashboardViewState => ({
  onlineAccess: Number(middleStats[0]?.value ?? 0),
  areaTotal: Number(middleStats[1]?.value ?? 0),
  vehiclesOnSite: Number(middleStats[2]?.value ?? 0),
  railStatus: middleStats[3]?.value === '占用' ? '占用' : '空闲',
  deviceRegions: [...INITIAL_DEVICE_REGIONS],
  deviceTypes: [...INITIAL_DEVICE_TYPES],
  deviceRecords: buildInitialRecords(INITIAL_DEVICE_REGIONS, INITIAL_DEVICE_TYPES),
})

const cloneState = (state: DashboardViewState): DashboardViewState => ({
  onlineAccess: state.onlineAccess,
  areaTotal: state.areaTotal,
  vehiclesOnSite: state.vehiclesOnSite,
  railStatus: state.railStatus,
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
    deviceRegions: [...data.deviceRegions],
    deviceTypes: [...data.deviceTypes],
    deviceRecords: data.deviceRecords.map((r) => ({ ...r })),
  }
}

const rebuildRecordsByDimensions = (
  regions: string[],
  devices: string[],
  sourceRecords: DashboardDeviceRecord[],
) => {
  const map = new Map(sourceRecords.map((it) => [`${it.region}@@${it.device}`, it]))
  return regions.flatMap((region) =>
    devices.map((device) => {
      const cached = map.get(`${region}@@${device}`)
      return cached ? { ...cached } : { region, device, online: 8, offline: 1 }
    }),
  )
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
  regionOptions.value = withAllOption(data.regions)
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
    const data = await getDeviceStatusOptions(regionId)
    applyOptionsData(data)
  } catch (e) {
    apiError.value = e instanceof Error ? e.message : String(e)
  }
}

const loadDashboardFromApi = async () => {
  apiLoading.value = true
  apiError.value = null
  try {
    const data = await getDashboardOverview()
    applyOverviewData(data)
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
    if (dataSource.value === 'api') {
      void loadDashboardFromApi()
    }
  }, 30_000)
}

const stopOverviewAutoRefresh = () => {
  if (overviewRefreshTimer !== null) {
    window.clearInterval(overviewRefreshTimer)
    overviewRefreshTimer = null
  }
}

const enterApiMode = async () => {
  selectedRegionId.value = 'all'
  selectedDeviceType.value = 'all'
  await loadDeviceStatusOptions('all')
  await loadDashboardFromApi()
  startOverviewAutoRefresh()
}

const handleRegionChange = async (newRegionId: string) => {
  selectedRegionId.value = newRegionId
  if (dataSource.value !== 'api') return
  selectedDeviceType.value = 'all'
  await loadDeviceStatusOptions(newRegionId)
  await loadDashboardFromApi()
}

const handleDeviceChange = async (newDeviceType: string) => {
  selectedDeviceType.value = newDeviceType
  if (dataSource.value !== 'api') return
  await loadDashboardFromApi()
}

watch(dataSource, (mode) => {
  if (mode === 'api') {
    void enterApiMode()
    return
  }
  stopOverviewAutoRefresh()
  projectMockToCurrent()
  initMockOptions()
})

let clockTimer: number | null = null
let debugKeyHandler: ((e: KeyboardEvent) => void) | null = null

const weekMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const

// 补零
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
  // 进入页面先更新一次，再每秒刷新
  updateClock()
  clockTimer = window.setInterval(updateClock, 1000)

  debugKeyHandler = (e: KeyboardEvent) => {
    // 快捷键F8
    const byF8 = e.key === 'F8'
    if (byF8) {
      e.preventDefault()
      showDebugPanel.value = !showDebugPanel.value
    }
  }
  window.addEventListener('keydown', debugKeyHandler)
  initMockOptions()
})

onBeforeUnmount(() => {
  // 离开页面及时清理定时器，避免内存泄漏
  if (clockTimer !== null) {
    window.clearInterval(clockTimer)
  }
  if (debugKeyHandler) {
    window.removeEventListener('keydown', debugKeyHandler)
    debugKeyHandler = null
  }
  stopOverviewAutoRefresh()
})

// 底部菜单当前激活项
const activeMenu = ref<string | null>(null)

const handleBottomMenuClick = (item: (typeof bottomMenus)[number]) => {
  // 记录激活项，再跳转到目标系统地址
  activeMenu.value = item.label
  window.location.href = item.url
}

// 在设备数据数组中，找到"某区域 + 某设备"的那条记录，然后用新数据替换它
const handleDeviceRecordUpdate = (payload: DashboardDeviceRecord) => {
  if (dataSource.value === 'api') return
  const idx = mockState.value.deviceRecords.findIndex(
    (it) => it.region === payload.region && it.device === payload.device,
  )
  if (idx >= 0) {
    const next = mockState.value.deviceRecords.map((it, i) => (i === idx ? { ...payload } : { ...it }))
    mockState.value = { ...mockState.value, deviceRecords: next }
    if (dataSource.value === 'mock') {
      projectMockToCurrent()
    }
  }
}

const handleMockRegionsUpdate = (nextRegions: string[]) => {
  const nextRecords = rebuildRecordsByDimensions(
    nextRegions,
    mockState.value.deviceTypes,
    mockState.value.deviceRecords,
  )
  mockState.value = {
    ...mockState.value,
    deviceRegions: [...nextRegions],
    deviceRecords: nextRecords,
  }
  initMockOptions()
  if (dataSource.value === 'mock') projectMockToCurrent()
}

const handleMockDevicesUpdate = (nextDevices: string[]) => {
  const nextRecords = rebuildRecordsByDimensions(
    mockState.value.deviceRegions,
    nextDevices,
    mockState.value.deviceRecords,
  )
  mockState.value = {
    ...mockState.value,
    deviceTypes: [...nextDevices],
    deviceRecords: nextRecords,
  }
  initMockOptions()
  if (dataSource.value === 'mock') projectMockToCurrent()
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
</script>

<template>
  <CockpitShell>
    <div class="cockpit">
      <CockpitHeader
        :date-text="dateText"
        :time-text="timeText"
        :week-text="weekText"
        :backend-online="backendOnline"
        :backend-health-hint="healthError"
      />

      <div class="cockpit__body">
        <CockpitSceneMount />
        <CockpitSidePanels :left-panels="leftPanels" :right-panels="rightPanels">
          <!-- 向父组件的 CockpitPanelCard 中，指定一个名为 left-device 的插槽内容 -->
          <template #left-device>
            <CockpitDeviceStatus
              :records="currentState.deviceRecords"
              :region-options="regionOptions"
              :device-options="deviceOptions"
              v-model:selected-region-id="selectedRegionId"
              v-model:selected-device-type="selectedDeviceType"
              @region-change="handleRegionChange"
              @device-change="handleDeviceChange"
            />
          </template>
          <CockpitKpiStats :items="runtimeKpiStats" />
        </CockpitSidePanels>
        <CockpitDebugPanel
          :visible="showDebugPanel"
          v-model:data-source="dataSource"
          :api-loading="apiLoading"
          :api-error="apiError"
          :online-access="currentState.onlineAccess"
          :area-total="currentState.areaTotal"
          :vehicles-on-site="currentState.vehiclesOnSite"
          :rail-status="currentState.railStatus"
          :regions="currentState.deviceRegions"
          :devices="currentState.deviceTypes"
          :records="currentState.deviceRecords"
          @update:regions="handleMockRegionsUpdate"
          @update:devices="handleMockDevicesUpdate"
          @update:online-access="handleMockOnlineAccessUpdate"
          @update:area-total="handleMockAreaTotalUpdate"
          @update:vehicles-on-site="handleMockVehiclesOnSiteUpdate"
          @update:rail-status="handleMockRailStatusUpdate"
          @update:record="handleDeviceRecordUpdate"
          @refresh="loadDashboardFromApi"
        />
      </div>
      <CockpitBottomNav
        :menus="bottomMenus"
        :active-menu="activeMenu"
        @menu-click="handleBottomMenuClick"
      />
    </div>
  </CockpitShell>
</template>

<style scoped>
.cockpit {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.cockpit__body {
  flex: 1;
  position: relative;
  min-height: 0;
}
</style>
