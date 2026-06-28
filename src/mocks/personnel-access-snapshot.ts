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
  PERSONNEL_ACCESS_REGIONS,
  PERSONNEL_MATTER_TYPES,
  type PersonnelAccessGranularity,
  type PersonnelMatterStatItem,
  type PersonnelRegionStatItem,
  type PersonnelTimeStatItem,
} from '@/types/personnel-access'

/** 各粒度固定占比（顺序：进厂作业 / 参观访问 / 设备维护 / 物资运送 / 其他） */
const PERSONNEL_MATTER_RATIOS: Record<PersonnelAccessGranularity, readonly number[]> = {
  day: [72, 5, 6, 14, 3],
  month: [62, 8, 9, 17, 4],
  year: [54, 10, 10, 20, 6],
}

export type PersonnelAccessSnapshot = ReturnType<typeof computePersonnelAccessSnapshot>

const snapshotCache = new Map<string, PersonnelAccessSnapshot>()

function computePersonnelAccessSnapshot(
  granularity: PersonnelAccessGranularity,
  anchor: string,
) {
  const scale = scaleByGranularity(granularity)
  const seed = seedFromString(`personnel:${granularity}:${anchor}`)
  const envelope = buildGranularityEnvelope(granularity, anchor)

  const regionItems: PersonnelRegionStatItem[] = PERSONNEL_ACCESS_REGIONS.map((region, idx) => {
    const base = 40 + idx * 11
    const enterCount = Math.max(1, Math.round((base + pseudo(seed, idx * 2 + 1) * 80) * scale))
    return {
      regionId: region.id,
      regionName: region.name,
      enterCount,
      exitCount: enterCount,
    }
  })

  const enterTotal = regionItems.reduce((s, it) => s + it.enterCount, 0)
  const exitTotal = enterTotal

  const matterRatios = PERSONNEL_MATTER_RATIOS[granularity]

  const { items: matterItemsRaw } = buildMatterItemsFromRatios(
    PERSONNEL_MATTER_TYPES,
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
  })) as PersonnelMatterStatItem[]

  return {
    ...envelope,
    regionItems,
    matterItems,
    matterSummary: { totalCount: enterTotal },
    timeItems: timeItems as PersonnelTimeStatItem[],
    timeSummary: {
      ...timeSummaryRaw,
      enterTotal,
      exitTotal,
    },
    enterTotal,
    exitTotal,
  }
}

export function getPersonnelAccessSnapshot(
  granularity: AccessStatsGranularity,
  anchor: string,
): PersonnelAccessSnapshot {
  const key = `${granularity}:${anchor}`
  const cached = snapshotCache.get(key)
  if (cached) return cached

  const snapshot = computePersonnelAccessSnapshot(granularity, anchor)
  snapshotCache.set(key, snapshot)
  return snapshot
}

export function clearPersonnelAccessSnapshotCache() {
  snapshotCache.clear()
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    clearPersonnelAccessSnapshotCache()
  })
}
