import { apiClient } from '@/api/client'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildParkingScoreStatsMock } from '@/mocks/driving-monitor-parking-score-stats'
import { buildFatigueStatsMock } from '@/mocks/driving-monitor-fatigue-stats'
import { buildOcclusionStatsMock } from '@/mocks/driving-monitor-occlusion-stats'
import type {
  FatigueStatsApiResponse,
  FatigueStatsData,
  FatigueStatsQuery,
  OcclusionStatsApiResponse,
  OcclusionStatsData,
  OcclusionStatsQuery,
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
  if (resolveUseMock(options)) {
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

/** GET /api/driving-monitor/fatigue-stats */
export async function getFatigueStats(
  query: FatigueStatsQuery,
  options?: { useMock?: boolean },
): Promise<FatigueStatsData> {
  if (resolveUseMock(options)) {
    return buildFatigueStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<FatigueStatsApiResponse>(
    '/api/driving-monitor/fatigue-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取疲劳次数统计失败')
  }
  return body.data
}

/** GET /api/driving-monitor/occlusion-stats */
export async function getOcclusionStats(
  query: OcclusionStatsQuery,
  options?: { useMock?: boolean },
): Promise<OcclusionStatsData> {
  if (resolveUseMock(options)) {
    return buildOcclusionStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<OcclusionStatsApiResponse>(
    '/api/driving-monitor/occlusion-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取遮挡监测统计失败')
  }
  return body.data
}
