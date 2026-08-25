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
