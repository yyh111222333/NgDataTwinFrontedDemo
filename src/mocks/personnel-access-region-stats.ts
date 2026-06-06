import {
  ACCESS_GRANULARITY_OPTIONS,
  buildAccessPeriod,
  defaultAccessStatsAnchors,
  pseudo,
  scaleByGranularity,
  seedFromString,
} from '@/mocks/access-stats-shared'
import {
  PERSONNEL_ACCESS_REGIONS,
  type PersonnelAccessGranularity,
  type PersonnelRegionStatsData,
} from '@/types/personnel-access'

/**
 * 本地测试用 Mock：与后端约定字段一致，可直接 import 做图表联调。
 */
export function buildPersonnelRegionStatsMock(
  granularity: PersonnelAccessGranularity,
  anchor: string,
): PersonnelRegionStatsData {
  const period = buildAccessPeriod(granularity, anchor)
  const scale = scaleByGranularity(granularity)
  const seed = seedFromString(`${granularity}:${anchor}`)

  const items = PERSONNEL_ACCESS_REGIONS.map((region, idx) => {
    const base = 40 + idx * 11
    const enterCount = Math.max(1, Math.round((base + pseudo(seed, idx * 2 + 1) * 80) * scale))
    const exitCount = enterCount
    return {
      regionId: region.id,
      regionName: region.name,
      enterCount,
      exitCount,
    }
  })

  const enterTotal = items.reduce((s, it) => s + it.enterCount, 0)
  const exitTotal = items.reduce((s, it) => s + it.exitCount, 0)

  return {
    granularity,
    anchor,
    ...period,
    granularityOptions: [...ACCESS_GRANULARITY_OPTIONS],
    items,
    summary: {
      enterTotal,
      exitTotal,
      netIn: enterTotal - exitTotal,
    },
  }
}

export const defaultPersonnelRegionStatsAnchors = defaultAccessStatsAnchors
