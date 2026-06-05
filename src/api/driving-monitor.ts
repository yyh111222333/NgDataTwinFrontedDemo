import { apiClient } from '@/api/client'
import { buildParkingScoreStatsMock } from '@/mocks/driving-monitor-parking-score-stats'
import type {
  ParkingScoreStatsApiResponse,
  ParkingScoreStatsData,
  ParkingScoreStatsQuery,
} from '@/types/driving-monitor'

/**
 * 行车监测 — 停车评分统计
 *
 * GET /api/driving-monitor/parking-score-stats
 */
export async function getParkingScoreStats(
  query: ParkingScoreStatsQuery,
  options?: { useMock?: boolean },
): Promise<ParkingScoreStatsData> {
  if (options?.useMock) {
    return buildParkingScoreStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<ParkingScoreStatsApiResponse>(
    '/api/driving-monitor/parking-score-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取停车评分统计失败')
  }
  return body.data
}
