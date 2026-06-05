import {
  ACCESS_GRANULARITY_OPTIONS,
  buildAccessPeriod,
  defaultAccessStatsAnchors,
  pseudo,
  seedFromString,
} from '@/mocks/access-stats-shared'
import {
  DANGER_EVENT_TYPES,
  type DangerEventStatsData,
  type SmartMonitorGranularity,
} from '@/types/smart-monitor'

/** 各事件 Mock 基数权重 */
const EVENT_BASE_WEIGHTS = [18, 22, 20, 16, 14, 10] as const

const HIGH_RISK_IDS = new Set(['E', 'F'])

const scaleCountByGranularity = (granularity: SmartMonitorGranularity) => {
  if (granularity === 'day') return 1
  if (granularity === 'month') return 24
  return 300
}

export function buildDangerEventStatsMock(
  granularity: SmartMonitorGranularity,
  anchor: string,
): DangerEventStatsData {
  const period = buildAccessPeriod(granularity, anchor)
  const scale = scaleCountByGranularity(granularity)
  const seed = seedFromString(`danger-event:${granularity}:${anchor}`)

  const rawCounts = DANGER_EVENT_TYPES.map((_, idx) => {
    const wobble = 0.7 + pseudo(seed, idx + 5) * 0.6
    return Math.max(1, Math.round(EVENT_BASE_WEIGHTS[idx]! * wobble * scale))
  })

  const totalCount = rawCounts.reduce((s, n) => s + n, 0)

  const items = DANGER_EVENT_TYPES.map((evt, idx) => {
    const count = rawCounts[idx]!
    const percentage = Math.round((count / totalCount) * 1000) / 10
    return {
      eventId: evt.id,
      eventName: evt.name,
      count,
      percentage,
    }
  })

  const highRiskCount = items
    .filter((it) => HIGH_RISK_IDS.has(it.eventId))
    .reduce((s, it) => s + it.count, 0)

  return {
    granularity,
    anchor,
    ...period,
    granularityOptions: [...ACCESS_GRANULARITY_OPTIONS],
    items,
    summary: {
      totalCount,
      highRiskCount,
    },
  }
}

export const defaultDangerEventStatsAnchors = defaultAccessStatsAnchors
