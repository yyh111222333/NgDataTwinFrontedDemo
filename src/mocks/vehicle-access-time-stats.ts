import { getVehicleAccessSnapshot } from '@/mocks/vehicle-access-snapshot'
import type { VehicleAccessGranularity, VehicleTimeStatsData } from '@/types/vehicle-access'

export function buildVehicleTimeStatsMock(
  granularity: VehicleAccessGranularity,
  anchor: string,
): VehicleTimeStatsData {
  const snapshot = getVehicleAccessSnapshot(granularity, anchor)

  return {
    granularity: snapshot.granularity,
    anchor: snapshot.anchor,
    periodLabel: snapshot.periodLabel,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    granularityOptions: snapshot.granularityOptions,
    items: snapshot.timeItems,
    summary: snapshot.timeSummary,
  }
}
