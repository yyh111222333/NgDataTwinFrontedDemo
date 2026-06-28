import {
  buildGranularityEnvelope,
  pseudo,
  seedFromString,
} from '@/mocks/access-stats-shared'
import {
  FATIGUE_CRANE_UNITS,
  type DrivingMonitorGranularity,
  type FatigueStatsData,
} from '@/types/driving-monitor'

/** 按日基准：大部分为0，只有少数行车可能有1-2次 */
const DAY_BASE_COUNTS = [0, 1, 0, 2, 0] as const

/** 按月基准：比日多一些，每个行车平均1-5次 */
const MONTH_BASE_COUNTS = [2, 4, 3, 5, 2] as const

/** 按年基准：比月多一些，每个行车平均10-30次 */
const YEAR_BASE_COUNTS = [12, 18, 15, 22, 10] as const

export function buildFatigueStatsMock(
  granularity: DrivingMonitorGranularity,
  anchor: string,
): FatigueStatsData {
  const seed = seedFromString(`fatigue:${granularity}:${anchor}`)

  const baseCounts =
    granularity === 'day'
      ? DAY_BASE_COUNTS
      : granularity === 'month'
        ? MONTH_BASE_COUNTS
        : YEAR_BASE_COUNTS

  const items = FATIGUE_CRANE_UNITS.map((crane, idx) => {
    const base = baseCounts[idx]!
    const wobble = pseudo(seed, idx + 2)
    const fatigueCount = Math.round(base * (0.8 + wobble * 0.4))
    return {
      craneId: crane.id,
      craneName: crane.name,
      fatigueCount,
    }
  })

  const totalCount = items.reduce((s, it) => s + it.fatigueCount, 0)
  const max = items.reduce(
    (best, it) => (it.fatigueCount > best.fatigueCount ? it : best),
    items[0]!,
  )

  return {
    ...buildGranularityEnvelope(granularity, anchor),
    items,
    summary: {
      totalCount,
      maxCraneName: max.craneName,
      maxCount: max.fatigueCount,
    },
  }
}
