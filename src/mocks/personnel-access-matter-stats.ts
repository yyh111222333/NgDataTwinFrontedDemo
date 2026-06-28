import { getPersonnelAccessSnapshot } from '@/mocks/personnel-access-snapshot'
import type { PersonnelAccessGranularity, PersonnelMatterStatsData } from '@/types/personnel-access'

export function buildPersonnelMatterStatsMock(
  granularity: PersonnelAccessGranularity,
  anchor: string,
): PersonnelMatterStatsData {
  const snapshot = getPersonnelAccessSnapshot(granularity, anchor)

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
