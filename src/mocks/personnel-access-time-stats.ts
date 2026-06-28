import { getPersonnelAccessSnapshot } from '@/mocks/personnel-access-snapshot'
import type { PersonnelAccessGranularity, PersonnelTimeStatsData } from '@/types/personnel-access'

export function buildPersonnelTimeStatsMock(
  granularity: PersonnelAccessGranularity,
  anchor: string,
): PersonnelTimeStatsData {
  const snapshot = getPersonnelAccessSnapshot(granularity, anchor)

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
