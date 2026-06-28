import { apiClient } from '@/api/client'
import { normalizeRailStatus } from '@/api/dashboard-rail-status'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildDashboardOverviewMock } from '@/mocks/dashboard-overview'
import { buildDeviceStatusOptionsMock } from '@/mocks/device-status-options'
import type {
  DashboardDeviceRecord,
  DashboardOverviewApiResponse,
  DashboardOverviewData,
  DeviceStatusOptionsApiResponse,
  DeviceStatusOptionsData,
} from '@/types/dashboard'

export type DashboardOverviewOptions = {
  useMock?: boolean
  /** Mock 轮询序号，用于模拟 30s 刷新后数据小幅变化 */
  mockTick?: number
}

const normalizeDeviceRecords = (records: DashboardDeviceRecord[] = []) =>
  records.map((row) => ({
    ...row,
    abnormal: row.abnormal ?? 0,
  }))

export async function getDashboardOverview(
  options?: DashboardOverviewOptions,
): Promise<DashboardOverviewData> {
  if (resolveUseMock(options)) {
    return buildDashboardOverviewMock(options?.mockTick ?? 0)
  }

  const { data: body } = await apiClient.get<DashboardOverviewApiResponse>('/api/dashboard/overview')
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取大屏概览失败')
  }

  return {
    ...body.data,
    railStatus: normalizeRailStatus(body.data.railStatus),
    alarmCount: body.data.alarmCount ?? 0,
    deviceRecords: normalizeDeviceRecords(body.data.deviceRecords),
  }
}

const isWrappedOptionsResponse = (body: unknown): body is DeviceStatusOptionsApiResponse => {
  return typeof body === 'object' && body != null && 'success' in body
}

export async function getDeviceStatusOptions(
  regionId: string,
  options?: { useMock?: boolean },
): Promise<DeviceStatusOptionsData> {
  if (resolveUseMock(options)) {
    return buildDeviceStatusOptionsMock(regionId)
  }

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
