import {
  ACCESS_GRANULARITY_OPTIONS,
  buildAccessPeriod,
  defaultAccessStatsAnchors,
  pseudo,
  seedFromString,
} from '@/mocks/access-stats-shared'
import {
  PARKING_SCORE_GRADES,
  type DrivingMonitorGranularity,
  type ParkingScoreStatsData,
} from '@/types/driving-monitor'

/** 各档位 Mock 基数（次），偏重优秀/良好以支撑平均分 91 */
const GRADE_BASE_WEIGHTS = [48, 34, 12, 4, 0] as const

const TARGET_AVERAGE_SCORE = 91

const scaleCountByGranularity = (granularity: DrivingMonitorGranularity) => {
  if (granularity === 'day') return 1
  if (granularity === 'month') return 26
  return 320
}

export function buildParkingScoreStatsMock(
  granularity: DrivingMonitorGranularity,
  anchor: string,
): ParkingScoreStatsData {
  const period = buildAccessPeriod(granularity, anchor)
  const scale = scaleCountByGranularity(granularity)
  const seed = seedFromString(`parking-score:${granularity}:${anchor}`)

  const rawCounts = PARKING_SCORE_GRADES.map((_, idx) => {
    const baseWeight = GRADE_BASE_WEIGHTS[idx]!
    if (baseWeight === 0) return 0
    const wobble = 0.75 + pseudo(seed, idx + 3) * 0.5
    return Math.max(1, Math.round(baseWeight * wobble * scale))
  })

  const totalCount = rawCounts.reduce((s, n) => s + n, 0)

  const items = PARKING_SCORE_GRADES.map((grade, idx) => {
    const count = rawCounts[idx]!
    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0
    return {
      gradeId: grade.id,
      gradeName: grade.name,
      count,
      percentage,
    }
  })

  return {
    granularity,
    anchor,
    ...period,
    granularityOptions: [...ACCESS_GRANULARITY_OPTIONS],
    items,
    summary: {
      totalCount,
      averageScore: TARGET_AVERAGE_SCORE,
    },
  }
}

export const defaultParkingScoreStatsAnchors = defaultAccessStatsAnchors
