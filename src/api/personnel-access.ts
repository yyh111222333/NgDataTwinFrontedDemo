import { apiClient } from '@/api/client'
import type {
  PersonnelDepartmentStatsApiResponse,
  PersonnelDepartmentStatsData,
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

/** K30 未配置离开方向时，沿用原版大屏的 1:1 离开柱展示；原始接口数据不变。 */
export function buildPersonnelDeviceDisplayData(
  data: PersonnelDeviceStatsData,
): PersonnelDeviceStatsData {
  if (data.summary.exitTotal > 0 || data.summary.enterTotal <= 0) return data

  const items = data.items.map((item) => ({
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
