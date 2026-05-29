import { apiClient } from '@/api/client'
import { buildPersonnelRegionStatsMock } from '@/mocks/personnel-access-region-stats'
import type {
  PersonnelRegionStatsApiResponse,
  PersonnelRegionStatsData,
  PersonnelRegionStatsQuery,
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
  if (options?.useMock) {
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
