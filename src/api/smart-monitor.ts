import { apiClient } from '@/api/client'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildDangerEventStatsMock } from '@/mocks/smart-monitor-danger-event-stats'
import { buildStorageStatusMock } from '@/mocks/smart-monitor-storage-status'
import type {
  DangerEventStatsApiResponse,
  DangerEventStatsData,
  DangerEventStatsQuery,
  StorageStatusApiResponse,
  StorageStatusData,
} from '@/types/smart-monitor'

/**
 * 智慧监控 — 危险事件统计
 *
 * GET /api/smart-monitor/danger-event-stats
 */
export async function getDangerEventStats(
  query: DangerEventStatsQuery,
  options?: { useMock?: boolean },
): Promise<DangerEventStatsData> {
  if (resolveUseMock(options)) {
    return buildDangerEventStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<DangerEventStatsApiResponse>(
    '/api/smart-monitor/danger-event-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取危险事件统计失败')
  }
  return body.data
}

/**
 * 智慧监控 — 存储状况监控
 *
 * GET /api/smart-monitor/storage-status
 */
export async function getStorageStatus(
  options?: { useMock?: boolean },
): Promise<StorageStatusData> {
  if (resolveUseMock(options)) {
    return buildStorageStatusMock()
  }

  const { data: body } = await apiClient.get<StorageStatusApiResponse>(
    '/api/smart-monitor/storage-status',
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取存储状况失败')
  }
  return body.data
}
