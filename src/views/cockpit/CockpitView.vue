<script setup lang="ts">
// 页面组装层：只负责拼装组件、管理页面级状态（时间、底部激活项、跳转）
import CockpitBottomNav from '@/components/cockpit/CockpitBottomNav.vue'
import CockpitDeviceStatus from '@/components/cockpit/CockpitDeviceStatus.vue'
import CockpitDebugPanel from '@/components/cockpit/CockpitDebugPanel.vue'
import CockpitHeader from '@/components/cockpit/CockpitHeader.vue'
import CockpitKpiStats from '@/components/cockpit/CockpitKpiStats.vue'
import CockpitSceneMount from '@/components/cockpit/CockpitSceneMount.vue'
import CockpitSidePanels from '@/components/cockpit/CockpitSidePanels.vue'
import { bottomMenus, middleStats, panels } from '@/config/cockpit'
import CockpitShell from '@/layouts/CockpitShell.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// 从统一配置里拆出左右两列，模板里直接使用
const leftPanels = panels.filter((panel) => panel.side === 'left')
const rightPanels = panels.filter((panel) => panel.side === 'right')

// 顶栏时间展示：日期、时分秒、星期
const dateText = ref('')
const timeText = ref('')
const weekText = ref('')
const showDebugPanel = ref(false)
const onlineAccess = ref(Number(middleStats[0]?.value ?? 0))
const areaTotal = ref(Number(middleStats[1]?.value ?? 0))
const vehiclesOnSite = ref(Number(middleStats[2]?.value ?? 0))
const railStatus = ref<'空闲' | '占用'>(middleStats[3]?.value === '占用' ? '占用' : '空闲')

const runtimeKpiStats = computed(() => [
  { value: String(onlineAccess.value), label: '在线门禁' },
  { value: String(areaTotal.value), label: '区域总人数' },
  { value: String(vehiclesOnSite.value), label: '车辆在场' },
  { value: railStatus.value, label: '火车道状态' },
])

// 定义了一个 8 个区域 × 8 种设备 = 64 条记录的数据结构，每条记录包含在线/离线数量
const deviceRegions: string[] = ['A区', 'F区', 'L区', '成品库', '火车道', '道路', '厂房', '作业区']
const deviceTypes: string[] = [
  '人员智能门/联锁门',
  '车辆识别与道闸',
  '火车道联动门',
  '摄像机',
  '声光报警',
  '光电报警',
  '烟感器',
  '温感器',
]
type DeviceStatRecord = {
  region: string
  device: string
  online: number
  offline: number
}
const deviceRecords = ref<DeviceStatRecord[]>(
  deviceRegions.flatMap((region) =>
    deviceTypes.map((device) => ({
      region,
      device,
      online: 8,
      offline: 1,
    })),
  ),
)

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
})

// 底部菜单当前激活项
const activeMenu = ref<string | null>(null)

const handleBottomMenuClick = (item: (typeof bottomMenus)[number]) => {
  // 记录激活项，再跳转到目标系统地址
  activeMenu.value = item.label
  window.location.href = item.url
}

// 在设备数据数组中，找到"某区域 + 某设备"的那条记录，然后用新数据替换它
const handleDeviceRecordUpdate = (payload: DeviceStatRecord) => {
  const idx = deviceRecords.value.findIndex(
    (it) => it.region === payload.region && it.device === payload.device,
  )
  if (idx >= 0) deviceRecords.value[idx] = payload
}
</script>

<template>
  <CockpitShell>
    <div class="cockpit">
      <CockpitHeader :date-text="dateText" :time-text="timeText" :week-text="weekText" />

      <div class="cockpit__body">
        <CockpitSceneMount />
        <CockpitSidePanels :left-panels="leftPanels" :right-panels="rightPanels">
          <!-- 向父组件的 CockpitPanelCard 中，指定一个名为 left-device 的插槽内容 -->
          <template #left-device>
            <CockpitDeviceStatus
              :records="deviceRecords"
              :regions="deviceRegions"
              :devices="deviceTypes"
            />
          </template>
          <CockpitKpiStats :items="runtimeKpiStats" />
        </CockpitSidePanels>
        <CockpitDebugPanel
          :visible="showDebugPanel"
          :online-access="onlineAccess"
          :area-total="areaTotal"
          :vehicles-on-site="vehiclesOnSite"
          :rail-status="railStatus"
          :regions="deviceRegions"
          :devices="deviceTypes"
          :records="deviceRecords"
          @update:online-access="onlineAccess = $event"
          @update:area-total="areaTotal = $event"
          @update:vehicles-on-site="vehiclesOnSite = $event"
          @update:rail-status="railStatus = $event"
          @update:record="handleDeviceRecordUpdate"
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
