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

/** 各档位 Mock 基数（次），总和约 100% */
const GRADE_BASE_WEIGHTS = [32, 28, 22, 12, 6] as const

/** 各档位 Mock 均分（用于计算 summary.averageScore） */
const GRADE_AVG_SCORES = [95, 84, 74, 64, 48] as const

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
    const wobble = 0.75 + pseudo(seed, idx + 3) * 0.5
    return Math.max(1, Math.round(GRADE_BASE_WEIGHTS[idx]! * wobble * scale))
  })

  const totalCount = rawCounts.reduce((s, n) => s + n, 0)
  const weightedScore = rawCounts.reduce(
    (s, count, idx) => s + count * GRADE_AVG_SCORES[idx]!,
    0,
  )
  const averageScore = Math.round((weightedScore / totalCount) * 10) / 10

  const items = PARKING_SCORE_GRADES.map((grade, idx) => {
    const count = rawCounts[idx]!
    const percentage = Math.round((count / totalCount) * 1000) / 10
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
      averageScore,
    },
  }
}

export const defaultParkingScoreStatsAnchors = defaultAccessStatsAnchors
