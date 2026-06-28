import { buildGranularityEnvelope, pseudo, seedFromString } from '@/mocks/access-stats-shared'
import {
  OCCLUSION_CAMERA_NODES,
  type DrivingMonitorGranularity,
  type OcclusionStatsData,
  type OcclusionStatusLevel,
} from '@/types/driving-monitor'

/** 按日基准：今天全部为0，无遮挡 */
const DAY_BASE_COUNTS = [0, 0, 0, 0, 0, 0] as const

/** 按月基准：少写一点，保持预警数1-2个 */
const MONTH_BASE_COUNTS = [0, 1, 0, 2, 1, 0] as const

/** 按年基准：适当多一些，但保持较低水平 */
const YEAR_BASE_COUNTS = [3, 5, 4, 8, 4, 3] as const

const resolveStatus = (count: number): OcclusionStatusLevel => {
  if (count >= 4) return 'critical'
  if (count >= 1) return 'warning'
  return 'normal'
}

export function buildOcclusionStatsMock(
  granularity: DrivingMonitorGranularity,
  anchor: string,
): OcclusionStatsData {
  const seed = seedFromString(`occlusion:${granularity}:${anchor}`)

  const baseCounts =
    granularity === 'day'
      ? DAY_BASE_COUNTS
      : granularity === 'month'
        ? MONTH_BASE_COUNTS
        : YEAR_BASE_COUNTS

  const items = OCCLUSION_CAMERA_NODES.map((cam, idx) => {
    const base = baseCounts[idx]!
    const wobble = pseudo(seed, idx + 4)
    const occlusionCount = Math.round(base * (0.8 + wobble * 0.4))
    // 时长按每次 3-8 分钟计算，保持较短
    const durationMinutes = Math.round(occlusionCount * (3 + pseudo(seed, idx + 11) * 5))
    return {
      cameraId: cam.id,
      cameraName: cam.name,
      occlusionCount,
      durationMinutes,
      status: resolveStatus(occlusionCount),
    }
  })

  const totalCount = items.reduce((s, it) => s + it.occlusionCount, 0)
  const totalDurationMinutes = items.reduce((s, it) => s + it.durationMinutes, 0)
  const alertCount = items.filter((it) => it.status !== 'normal').length

  return {
    ...buildGranularityEnvelope(granularity, anchor),
    items,
    summary: { totalCount, totalDurationMinutes, alertCount },
  }
}
