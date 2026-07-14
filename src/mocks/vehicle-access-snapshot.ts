import {

  buildGranularityEnvelope,

  buildMatterItemsFromRatios,

  buildTimeSlotItemsFromTotals,

  pseudo,

  scaleByGranularity,

  seedFromString,

  type AccessStatsGranularity,

} from '@/mocks/access-stats-shared'

import {

  VEHICLE_ACCESS_CHANNELS,

  VEHICLE_MATTER_TYPES,

  type VehicleAccessGranularity,

  type VehicleChannelStatItem,

  type VehicleMatterStatItem,

  type VehicleTimeStatItem,

} from '@/types/vehicle-access'



/** Mock 模式下各车牌类型的固定占比。 */

const VEHICLE_MATTER_RATIOS: Record<VehicleAccessGranularity, readonly number[]> = {

  day: [42, 36, 8, 10, 4],

  month: [36, 40, 9, 11, 4],

  year: [32, 38, 10, 14, 6],

}



export type VehicleAccessSnapshot = ReturnType<typeof computeVehicleAccessSnapshot>



const snapshotCache = new Map<string, VehicleAccessSnapshot>()



function computeVehicleAccessSnapshot(granularity: VehicleAccessGranularity, anchor: string) {

  const scale = scaleByGranularity(granularity)

  const seed = seedFromString(`vehicle:${granularity}:${anchor}`)

  const envelope = buildGranularityEnvelope(granularity, anchor)



  const channelItems: VehicleChannelStatItem[] = VEHICLE_ACCESS_CHANNELS.map((channel, idx) => {
    const base = 2 + idx
    const enterCount = Math.max(1, Math.round((base + pseudo(seed, idx * 2 + 7) * 8) * scale))
    return {

      channelId: channel.id,

      channelName: channel.name,

      enterCount,

      exitCount: enterCount,

    }

  })



  const enterTotal = channelItems.reduce((s, it) => s + it.enterCount, 0)

  const exitTotal = enterTotal



  const matterRatios = VEHICLE_MATTER_RATIOS[granularity]



  const { items: matterItemsRaw } = buildMatterItemsFromRatios(

    VEHICLE_MATTER_TYPES,

    matterRatios,

    enterTotal,

  )



  const { items: timeItems, summary: timeSummaryRaw } = buildTimeSlotItemsFromTotals(

    enterTotal,

    exitTotal,

    seed + 200,

  )



  const matterItems = matterItemsRaw.map((item) => ({

    ...item,

    percentage: enterTotal > 0 ? Math.round((item.count / enterTotal) * 1000) / 10 : 0,

  })) as VehicleMatterStatItem[]



  return {

    ...envelope,

    channelItems,

    matterItems,

    matterSummary: { totalCount: enterTotal },

    timeItems: timeItems as VehicleTimeStatItem[],

    timeSummary: {

      ...timeSummaryRaw,

      enterTotal,

      exitTotal,

    },

    enterTotal,

    exitTotal,

  }

}



export function getVehicleAccessSnapshot(

  granularity: AccessStatsGranularity,

  anchor: string,

): VehicleAccessSnapshot {

  const key = `${granularity}:${anchor}`

  const cached = snapshotCache.get(key)

  if (cached) return cached



  const snapshot = computeVehicleAccessSnapshot(granularity, anchor)

  snapshotCache.set(key, snapshot)

  return snapshot

}



export function clearVehicleAccessSnapshotCache() {

  snapshotCache.clear()

}



if (import.meta.hot) {

  import.meta.hot.accept(() => {

    clearVehicleAccessSnapshotCache()

  })

}
