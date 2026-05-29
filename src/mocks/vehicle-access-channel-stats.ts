import {
  ACCESS_GRANULARITY_OPTIONS,
  buildAccessPeriod,
  defaultAccessStatsAnchors,
  pseudo,
  scaleByGranularity,
  seedFromString,
  type AccessStatsGranularity,
} from '@/mocks/access-stats-shared'
import { VEHICLE_ACCESS_CHANNELS, type VehicleChannelStatsData } from '@/types/vehicle-access'

export function buildVehicleChannelStatsMock(
  granularity: AccessStatsGranularity,
  anchor: string,
): VehicleChannelStatsData {
  const period = buildAccessPeriod(granularity, anchor)
  const scale = scaleByGranularity(granularity)
  const seed = seedFromString(`vehicle:${granularity}:${anchor}`)

  const items = VEHICLE_ACCESS_CHANNELS.map((channel, idx) => {
    const base = 28 + idx * 9
    const enter = Math.round((base + pseudo(seed, idx * 2 + 7) * 65) * scale)
    const exit = Math.round((base - 3 + pseudo(seed, idx * 2 + 11) * 60) * scale)
    return {
      channelId: channel.id,
      channelName: channel.name,
      enterCount: enter,
      exitCount: exit,
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

export const defaultVehicleChannelStatsAnchors = defaultAccessStatsAnchors
