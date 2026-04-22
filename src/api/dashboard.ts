import { apiClient } from '@/api/client'
import type {
  DashboardOverviewApiResponse,
  DashboardOverviewData,
  DeviceStatusOptionsApiResponse,
  DeviceStatusOptionsData,
} from '@/types/dashboard'

export async function getDashboardOverview(): Promise<DashboardOverviewData> {
  const { data: body } = await apiClient.get<DashboardOverviewApiResponse>('/api/dashboard/overview')
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取大屏概览失败')
  }
  return body.data
}

const isWrappedOptionsResponse = (body: unknown): body is DeviceStatusOptionsApiResponse => {
  return typeof body === 'object' && body != null && 'success' in body
}

export async function getDeviceStatusOptions(regionId: string): Promise<DeviceStatusOptionsData> {
  const { data: body } = await apiClient.get<DeviceStatusOptionsApiResponse | DeviceStatusOptionsData>(
    '/api/device-status/options',
    { params: { regionId } },
  )

  if (isWrappedOptionsResponse(body)) {
    if (!body.success || body.data == null) {
      throw new Error(body.message || '获取设备筛选项失败')
    }
    return body.data
  }

  return body
}
