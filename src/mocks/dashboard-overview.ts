import {
  DASHBOARD_DEVICE_REGIONS,
  DASHBOARD_DEVICE_TYPES,
} from '@/config/device-status-catalog'
import { buildDeviceStatusRecords } from '@/mocks/device-status-inventory'
import type { DashboardOverviewData, RailStatus } from '@/types/dashboard'

export { DASHBOARD_DEVICE_REGIONS, DASHBOARD_DEVICE_TYPES }

/** 本地 Mock：每 30s 轮询时 tick 递增，在线/离线划分小幅波动，各设备总台数不变 */
export function buildDashboardOverviewMock(tick = 0): DashboardOverviewData {
  const onlineAccess = 22 + (tick % 5)
  const areaTotal = 128 + (tick % 17)
  const vehiclesOnSite = 18 + (tick % 9)
  const railStatus: RailStatus = tick > 0 && tick % 6 === 0 ? '占用' : '空闲'
  const alarmCount = tick > 0 && tick % 8 === 0 ? 2 : 0

  return {
    onlineAccess,
    areaTotal,
    vehiclesOnSite,
    railStatus,
    alarmCount,
    deviceRegions: [...DASHBOARD_DEVICE_REGIONS],
    deviceTypes: [...DASHBOARD_DEVICE_TYPES],
    deviceRecords: buildDeviceStatusRecords(tick),
    updatedAt: new Date().toISOString(),
  }
}

export { buildDeviceStatusRecords } from '@/mocks/device-status-inventory'
