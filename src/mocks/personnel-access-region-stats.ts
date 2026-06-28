import { defaultAccessStatsAnchors } from '@/mocks/access-stats-shared'
import { getPersonnelAccessSnapshot } from '@/mocks/personnel-access-snapshot'
import type { PersonnelAccessGranularity, PersonnelRegionStatsData } from '@/types/personnel-access'

/**
 * 本地测试用 Mock：与后端约定字段一致，可直接 import 做图表联调。
 * 区域 / 事项 / 时间三个 Tab 共用同一快照，进出总量一致。
 */
export function buildPersonnelRegionStatsMock(
  granularity: PersonnelAccessGranularity,
  anchor: string,
): PersonnelRegionStatsData {
  const snapshot = getPersonnelAccessSnapshot(granularity, anchor)

  return {
    granularity: snapshot.granularity,
    anchor: snapshot.anchor,
    periodLabel: snapshot.periodLabel,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd,
    granularityOptions: snapshot.granularityOptions,
    items: snapshot.regionItems,
    summary: {
      enterTotal: snapshot.enterTotal,
      exitTotal: snapshot.exitTotal,
      netIn: snapshot.enterTotal - snapshot.exitTotal,
    },
  }
}

export const defaultPersonnelRegionStatsAnchors = defaultAccessStatsAnchors
