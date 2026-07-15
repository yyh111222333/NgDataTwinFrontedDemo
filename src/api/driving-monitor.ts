import {
  loadCraneFatigueStats,
  loadCraneOcclusionStats,
  loadCraneParkingStats,
} from '@/api/crane-subsystem-monitor'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildParkingScoreStatsMock } from '@/mocks/driving-monitor-parking-score-stats'
import { buildFatigueStatsMock } from '@/mocks/driving-monitor-fatigue-stats'
import { buildOcclusionStatsMock } from '@/mocks/driving-monitor-occlusion-stats'
import type {
  FatigueStatsData,
  FatigueStatsQuery,
  OcclusionStatsData,
  OcclusionStatsQuery,
  ParkingScoreStatsData,
  ParkingScoreStatsQuery,
} from '@/types/driving-monitor'

/**
 * 行车监测 — 停车评分统计
 *
 * 数据源：/gateway/crane/crane-monitor-source.json
 */
export async function getParkingScoreStats(
  query: ParkingScoreStatsQuery,
  options?: { useMock?: boolean },
): Promise<ParkingScoreStatsData> {
  if (resolveUseMock(options)) {
    return buildParkingScoreStatsMock(query.granularity, query.anchor)
  }

  return loadCraneParkingStats(query.granularity, query.anchor)
}

/** 行车子系统疲劳风险统计 */
export async function getFatigueStats(
  query: FatigueStatsQuery,
  options?: { useMock?: boolean },
): Promise<FatigueStatsData> {
  if (resolveUseMock(options)) {
    return buildFatigueStatsMock(query.granularity, query.anchor)
  }

  return loadCraneFatigueStats(query.granularity, query.anchor)
}

/** 行车子系统遮挡告警统计 */
export async function getOcclusionStats(
  query: OcclusionStatsQuery,
  options?: { useMock?: boolean },
): Promise<OcclusionStatsData> {
  if (resolveUseMock(options)) {
    return buildOcclusionStatsMock(query.granularity, query.anchor)
  }

  return loadCraneOcclusionStats(query.granularity, query.anchor)
}
