import { apiClient } from '@/api/client'
import { buildDangerEventStatsMock } from '@/mocks/smart-monitor-danger-event-stats'
import type {
  DangerEventStatsApiResponse,
  DangerEventStatsData,
  DangerEventStatsQuery,
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
  if (options?.useMock) {
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
