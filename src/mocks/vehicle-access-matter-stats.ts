import { getVehicleAccessSnapshot } from '@/mocks/vehicle-access-snapshot'
import type { VehicleAccessGranularity, VehicleMatterStatsData } from '@/types/vehicle-access'

export function buildVehicleMatterStatsMock(
  granularity: VehicleAccessGranularity,
  anchor: string,
): VehicleMatterStatsData {
  const snapshot = getVehicleAccessSnapshot(granularity, anchor)

  return {
    granularity: snapshot.granularity,
    anchor: snapshot.anchor,
    periodLabel: snapshot.periodLabel,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    granularityOptions: snapshot.granularityOptions,
    items: snapshot.matterItems,
    summary: snapshot.matterSummary,
  }
}
