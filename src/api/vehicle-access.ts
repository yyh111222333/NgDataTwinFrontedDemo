import { apiClient } from '@/api/client'
import { resolveUseMock } from '@/api/resolve-use-mock'
import {
  ACCESS_TIME_SLOTS,
  buildAccessPeriod,
  buildGranularityEnvelope,
} from '@/mocks/access-stats-shared'
import { buildVehicleChannelStatsMock } from '@/mocks/vehicle-access-channel-stats'
import { buildVehicleMatterStatsMock } from '@/mocks/vehicle-access-matter-stats'
import { buildVehicleTimeStatsMock } from '@/mocks/vehicle-access-time-stats'
import type {
  VehicleAccessGranularity,
  VehicleChannelStatsData,
  VehicleChannelStatsQuery,
  VehicleMatterId,
  VehicleMatterStatsData,
  VehicleMatterStatsQuery,
  VehicleTimeStatItem,
  VehicleTimeStatsData,
  VehicleTimeStatsQuery,
} from '@/types/vehicle-access'
import { VEHICLE_ACCESS_CHANNELS, VEHICLE_MATTER_TYPES } from '@/types/vehicle-access'

type ParkingStatsResponse = {
  summary: {
    entries: number
    exits: number
    inside: number
    remaining_spaces: number
    online_gates: number
    offline_gates: number
    unregistered_events: number
  }
  channels: Array<{ gate_no: number; enter_count: number; exit_count: number }>
  matters: Record<string, number>
  timeline: Array<{ captured_at: string; direction: 'in' | 'out' }>
  period: { start: string; end: string }
}

export type VehiclePlatformSummary = {
  vehiclesOnSite: number
  remainingSpaces: number
  onlineDevices: number
  offlineDevices: number
}

type PeriodBounds = { start: string; end: string }
type CachedStats = { expiresAt: number; promise: Promise<ParkingStatsResponse> }

const statsCache = new Map<string, CachedStats>()
const CACHE_MS = 5_000

const toPeriodBounds = (granularity: VehicleAccessGranularity, anchor: string): PeriodBounds => {
  const period = buildAccessPeriod(granularity, anchor)
  return {
    start: `${period.periodStart} 00:00:00`,
    end: `${period.periodEnd} 23:59:59`,
  }
}

const fetchParkingStats = async (
  granularity: VehicleAccessGranularity,
  anchor: string,
): Promise<ParkingStatsResponse> => {
  const cacheKey = `${granularity}:${anchor}`
  const cached = statsCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const promise = apiClient
    .get<ParkingStatsResponse>('/parking-api/public/stats', {
      params: toPeriodBounds(granularity, anchor),
      timeout: 8_000,
    })
    .then(({ data }) => data)
  statsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, promise })
  try {
    return await promise
  } catch (error) {
    statsCache.delete(cacheKey)
    throw error
  }
}

const buildTimeSlots = (
  granularity: VehicleAccessGranularity,
  anchor: string,
): VehicleTimeStatItem[] => {
  if (granularity === 'day') {
    return ACCESS_TIME_SLOTS.map((slot) => ({
      slotId: slot.id,
      slotLabel: slot.label,
      enterCount: 0,
      exitCount: 0,
    }))
  }
  if (granularity === 'month') {
    const { periodEnd } = buildAccessPeriod(granularity, anchor)
    return Array.from({ length: Number(periodEnd.slice(-2)) }, (_, index) => ({
      slotId: `d${String(index + 1).padStart(2, '0')}`,
      slotLabel: `${index + 1}日`,
      enterCount: 0,
      exitCount: 0,
    }))
  }
  return Array.from({ length: 12 }, (_, index) => ({
    slotId: `m${String(index + 1).padStart(2, '0')}`,
    slotLabel: `${index + 1}月`,
    enterCount: 0,
    exitCount: 0,
  }))
}

const getTimeSlotIndex = (value: string, granularity: VehicleAccessGranularity) => {
  if (granularity === 'day') return Math.floor(Number(value.slice(11, 13)) / 2)
  if (granularity === 'month') return Number(value.slice(8, 10)) - 1
  return Number(value.slice(5, 7)) - 1
}

const currentDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })

/** 读取新停车服务的实时在场车辆及相机在线状态。 */
export async function getVehiclePlatformSummary(): Promise<VehiclePlatformSummary> {
  const data = await fetchParkingStats('day', currentDay())
  return {
    vehiclesOnSite: data.summary.inside,
    remainingSpaces: data.summary.remaining_spaces,
    onlineDevices: data.summary.online_gates,
    offlineDevices: data.summary.offline_gates,
  }
}

/** 车辆进出 - 通道进出统计。 */
export async function getVehicleChannelStats(
  query: VehicleChannelStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleChannelStatsData> {
  if (resolveUseMock(options)) return buildVehicleChannelStatsMock(query.granularity, query.anchor)

  const data = await fetchParkingStats(query.granularity, query.anchor)
  const byGate = new Map(data.channels.map((item) => [String(item.gate_no), item]))
  const items = VEHICLE_ACCESS_CHANNELS.map((channel) => {
    const item = byGate.get(channel.id)
    return {
      channelId: channel.id,
      channelName: channel.name,
      enterCount: item?.enter_count ?? 0,
      exitCount: item?.exit_count ?? 0,
    }
  })
  return {
    ...buildGranularityEnvelope(query.granularity, query.anchor),
    items,
    summary: {
      enterTotal: data.summary.entries,
      exitTotal: data.summary.exits,
      netIn: data.summary.entries - data.summary.exits,
    },
  }
}

/** 车辆识别记录中的真实车牌颜色分布。 */
export async function getVehicleMatterStats(
  query: VehicleMatterStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleMatterStatsData> {
  if (resolveUseMock(options)) return buildVehicleMatterStatsMock(query.granularity, query.anchor)

  const data = await fetchParkingStats(query.granularity, query.anchor)
  const knownKeys = new Set(['yellow', 'blue', 'green', 'unlicensed'])
  const otherCount = Object.entries(data.matters).reduce(
    (sum, [key, count]) => sum + (knownKeys.has(key) ? 0 : count),
    0,
  )
  const counts: Record<VehicleMatterId, number> = {
    yellow: data.matters.yellow ?? 0,
    blue: data.matters.blue ?? 0,
    green: data.matters.green ?? 0,
    unlicensed: data.matters.unlicensed ?? 0,
    other: otherCount,
  }
  const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
  return {
    ...buildGranularityEnvelope(query.granularity, query.anchor),
    items: VEHICLE_MATTER_TYPES.map((matter) => ({
      matterId: matter.id,
      matterName: matter.name,
      count: counts[matter.id],
      percentage: totalCount > 0 ? Math.round((counts[matter.id] / totalCount) * 1_000) / 10 : 0,
    })),
    summary: { totalCount },
  }
}

/** 车辆识别记录的真实进出时间分布。 */
export async function getVehicleTimeStats(
  query: VehicleTimeStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleTimeStatsData> {
  if (resolveUseMock(options)) return buildVehicleTimeStatsMock(query.granularity, query.anchor)

  const data = await fetchParkingStats(query.granularity, query.anchor)
  const items = buildTimeSlots(query.granularity, query.anchor)
  data.timeline.forEach((event) => {
    const item = items[getTimeSlotIndex(event.captured_at, query.granularity)]
    if (!item) return
    if (event.direction === 'in') item.enterCount += 1
    else item.exitCount += 1
  })
  const peak = items.reduce(
    (current, item) => {
      const total = item.enterCount + item.exitCount
      return total > current.total ? { label: item.slotLabel, total } : current
    },
    { label: items[0]?.slotLabel ?? '-', total: 0 },
  )
  return {
    ...buildGranularityEnvelope(query.granularity, query.anchor),
    items,
    summary: {
      enterTotal: data.summary.entries,
      exitTotal: data.summary.exits,
      peakSlotLabel: peak.label,
      peakTotal: peak.total,
    },
  }
}
