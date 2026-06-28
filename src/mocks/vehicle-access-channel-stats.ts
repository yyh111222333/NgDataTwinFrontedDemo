import { defaultAccessStatsAnchors } from '@/mocks/access-stats-shared'
import { getVehicleAccessSnapshot } from '@/mocks/vehicle-access-snapshot'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import type { VehicleChannelStatsData } from '@/types/vehicle-access'

export function buildVehicleChannelStatsMock(
  granularity: AccessStatsGranularity,
  anchor: string,
): VehicleChannelStatsData {
  const snapshot = getVehicleAccessSnapshot(granularity, anchor)

  return {
    granularity: snapshot.granularity,
    anchor: snapshot.anchor,
    periodLabel: snapshot.periodLabel,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    granularityOptions: snapshot.granularityOptions,
    items: snapshot.channelItems,
    summary: {
      enterTotal: snapshot.enterTotal,
      exitTotal: snapshot.exitTotal,
      netIn: snapshot.enterTotal - snapshot.exitTotal,
    },
  }
}

export const defaultVehicleChannelStatsAnchors = defaultAccessStatsAnchors
