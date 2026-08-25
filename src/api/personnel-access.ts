import { apiClient } from '@/api/client'
import {
  PERSONNEL_ACCESS_REGIONS,
  PERSONNEL_DEVICE_REGION_IDS,
} from '@/config/cockpit-door-signal-map'
import type {
  PersonnelDepartmentStatsApiResponse,
  PersonnelDepartmentStatsData,
  PersonnelDeviceStatItem,
  PersonnelDeviceStatsApiResponse,
  PersonnelDeviceStatsData,
  PersonnelStatsQuery,
  PersonnelSummaryApiResponse,
  PersonnelSummaryData,
  PersonnelTimeStatsApiResponse,
  PersonnelTimeStatsData,
} from '@/types/personnel-access'

function unwrap<T>(
  body: { success: boolean; message: string; data?: T | null },
  fallback: string,
): T {
  if (!body.success || body.data == null) throw new Error(body.message || fallback)
  return body.data
}

export async function getPersonnelSummary(): Promise<PersonnelSummaryData> {
  const { data: body } = await apiClient.get<PersonnelSummaryApiResponse>(
    '/api/personnel-access/summary',
  )
  return unwrap(body, '获取人员总览失败')
}

export async function getPersonnelDeviceStats(
  query: PersonnelStatsQuery,
): Promise<PersonnelDeviceStatsData> {
  const { data: body } = await apiClient.get<PersonnelDeviceStatsApiResponse>(
    '/api/personnel-access/device-stats',
    { params: query },
  )
  return unwrap(body, '获取设备进出统计失败')
}

/**
 * 将 K30 人脸机数据按 SVG 厂区归并；K30 未配置离开方向时，
 * 沿用原版大屏的 1:1 离开柱展示。原始接口数据保持不变。
 */
export function buildPersonnelDeviceDisplayData(
  data: PersonnelDeviceStatsData,
): PersonnelDeviceStatsData {
  const regionItems: PersonnelDeviceStatItem[] = PERSONNEL_ACCESS_REGIONS.map((region) => ({
    deviceId: `region-${region.id}`,
    deviceName: region.name,
    enterCount: 0,
    exitCount: 0,
    unknownCount: 0,
    totalCount: 0,
  }))
  const regionItemsById = new Map(
    PERSONNEL_ACCESS_REGIONS.map((region, index) => [region.id, regionItems[index]!]),
  )
  const unassignedItem: PersonnelDeviceStatItem = {
    deviceId: 'region-unassigned',
    deviceName: '未分区',
    enterCount: 0,
    exitCount: 0,
    unknownCount: 0,
    totalCount: 0,
  }
  let hasUnassignedDevices = false

  data.items.forEach((item) => {
    const regionId = PERSONNEL_DEVICE_REGION_IDS[item.deviceId]
    const regionItem = regionId ? regionItemsById.get(regionId)! : unassignedItem
    if (!regionId) hasUnassignedDevices = true
    regionItem.enterCount += item.enterCount
    regionItem.exitCount += item.exitCount
    regionItem.unknownCount += item.unknownCount
    regionItem.totalCount += item.totalCount
  })
  if (hasUnassignedDevices) regionItems.push(unassignedItem)

  if (data.summary.exitTotal > 0 || data.summary.enterTotal <= 0) {
    return { ...data, items: regionItems }
  }

  const items = regionItems.map((item) => ({
    ...item,
    exitCount: item.enterCount,
    totalCount: item.enterCount * 2 + item.unknownCount,
  }))
  return {
    ...data,
    items,
    summary: {
      ...data.summary,
      exitTotal: data.summary.enterTotal,
      totalCount: data.summary.enterTotal * 2 + data.summary.unknownTotal,
    },
  }
}

export async function getPersonnelDepartmentStats(
  query: PersonnelStatsQuery,
): Promise<PersonnelDepartmentStatsData> {
  const { data: body } = await apiClient.get<PersonnelDepartmentStatsApiResponse>(
    '/api/personnel-access/department-stats',
    { params: query },
  )
  return unwrap(body, '获取部门通行分布失败')
}

export async function getPersonnelTimeStats(
  query: PersonnelStatsQuery,
): Promise<PersonnelTimeStatsData> {
  const { data: body } = await apiClient.get<PersonnelTimeStatsApiResponse>(
    '/api/personnel-access/time-stats',
    { params: query },
  )
  return unwrap(body, '获取人员进出时间分布失败')
}
