import { apiClient } from '@/api/client'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildPersonnelRegionStatsMock } from '@/mocks/personnel-access-region-stats'
import { buildPersonnelMatterStatsMock } from '@/mocks/personnel-access-matter-stats'
import { buildPersonnelTimeStatsMock } from '@/mocks/personnel-access-time-stats'
import type {
  PersonnelMatterStatsApiResponse,
  PersonnelMatterStatsData,
  PersonnelMatterStatsQuery,
  PersonnelRegionStatsApiResponse,
  PersonnelRegionStatsData,
  PersonnelRegionStatsQuery,
  PersonnelTimeStatsApiResponse,
  PersonnelTimeStatsData,
  PersonnelTimeStatsQuery,
} from '@/types/personnel-access'

/**
 * 人员进出 — 区域进出统计
 *
 * GET /api/personnel-access/region-stats
 * Query:
 *   - granularity: day | month | year
 *   - anchor: 与粒度对应的日期锚点（见 PersonnelRegionStatsData.anchor 注释）
 */
export async function getPersonnelRegionStats(
  query: PersonnelRegionStatsQuery,
  options?: { useMock?: boolean },
): Promise<PersonnelRegionStatsData> {
  if (resolveUseMock(options)) {
    return buildPersonnelRegionStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<PersonnelRegionStatsApiResponse>(
    '/api/personnel-access/region-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取区域进出统计失败')
  }
  return body.data
}

/** GET /api/personnel-access/matter-stats */
export async function getPersonnelMatterStats(
  query: PersonnelMatterStatsQuery,
  options?: { useMock?: boolean },
): Promise<PersonnelMatterStatsData> {
  if (resolveUseMock(options)) {
    return buildPersonnelMatterStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<PersonnelMatterStatsApiResponse>(
    '/api/personnel-access/matter-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取人员事项分布失败')
  }
  return body.data
}

/** GET /api/personnel-access/time-stats */
export async function getPersonnelTimeStats(
  query: PersonnelTimeStatsQuery,
  options?: { useMock?: boolean },
): Promise<PersonnelTimeStatsData> {
  if (resolveUseMock(options)) {
    return buildPersonnelTimeStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<PersonnelTimeStatsApiResponse>(
    '/api/personnel-access/time-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取人员进出时间分布失败')
  }
  return body.data
}
