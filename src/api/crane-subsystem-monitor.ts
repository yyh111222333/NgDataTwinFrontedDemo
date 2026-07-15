import { apiClient } from '@/api/client'
import {
  ACCESS_GRANULARITY_OPTIONS,
  buildAccessPeriod,
  distributeTotalByWeights,
} from '@/mocks/access-stats-shared'
import {
  PARKING_SCORE_GRADES,
  type DrivingMonitorGranularity,
  type FatigueStatsData,
  type OcclusionStatsData,
  type OcclusionStatusLevel,
  type ParkingScoreStatsData,
} from '@/types/driving-monitor'

interface CraneSourceValue {
  key: string
  label: string
  value: number
  unit: string
  min?: number
  max?: number
}

interface CraneSourceModule {
  id: 'parking' | 'fatigue' | 'shield'
  moduleIndex: number
  metrics: CraneSourceValue[]
  rows: CraneSourceValue[]
}

interface CraneMonitorSource {
  version: number
  fleetTotal: number
  modules: CraneSourceModule[]
}

interface DatedCraneModule {
  metrics: Map<string, number>
  rows: Array<{ key: string; label: string; value: number }>
}

const SOURCE_URL = '/gateway/crane/crane-monitor-source.json'

const clamp = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(max, Math.max(min, value))

// 与行车子系统页面保持同一套按日期取值规则。
const seededOffset = (seed: string, index: number) => {
  const code = seed
    .split('')
    .reduce((sum, char, charIndex) => sum + char.charCodeAt(0) * (charIndex + index + 3), 0)
  return (code % 9) - 4
}

const getDatedModule = (module: CraneSourceModule, date: string): DatedCraneModule => ({
  metrics: new Map(
    module.metrics.map((metric, metricIndex) => {
      const offset = seededOffset(date, module.moduleIndex + metricIndex)
      const rawValue = Number.isInteger(metric.value)
        ? metric.value + offset * (metricIndex + 1)
        : Number((metric.value + offset * 0.2).toFixed(1))
      return [metric.key, clamp(rawValue, metric.min, metric.max)]
    }),
  ),
  rows: module.rows.map((row, rowIndex) => ({
    key: row.key,
    label: row.label,
    value: clamp(row.value + seededOffset(date, module.moduleIndex + rowIndex), row.min, row.max),
  })),
})

const enumerateDates = (start: string, end: string) => {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

const fetchSource = async () => {
  const { data } = await apiClient.get<CraneMonitorSource>(SOURCE_URL, {
    params: { _: Date.now() },
  })
  if (!data?.modules?.length) throw new Error('行车子系统监测数据为空')
  return data
}

const requireModule = (source: CraneMonitorSource, id: CraneSourceModule['id']) => {
  const module = source.modules.find((item) => item.id === id)
  if (!module) throw new Error(`行车子系统缺少 ${id} 监测数据`)
  return module
}

const valueOf = (module: DatedCraneModule, key: string) => module.metrics.get(key) ?? 0

const sumRows = (modules: DatedCraneModule[]) => {
  const first = modules[0]?.rows ?? []
  return first.map((row, index) => ({
    key: row.key,
    label: row.label,
    value: modules.reduce((sum, module) => sum + (module.rows[index]?.value ?? 0), 0),
  }))
}

const loadPeriodModules = async (
  moduleId: CraneSourceModule['id'],
  granularity: DrivingMonitorGranularity,
  anchor: string,
) => {
  const period = buildAccessPeriod(granularity, anchor)
  const source = await fetchSource()
  const sourceModule = requireModule(source, moduleId)
  const modules = enumerateDates(period.periodStart, period.periodEnd).map((date) =>
    getDatedModule(sourceModule, date),
  )
  return { period, modules }
}

const envelope = (
  granularity: DrivingMonitorGranularity,
  anchor: string,
  period: ReturnType<typeof buildAccessPeriod>,
) => ({
  granularity,
  anchor,
  ...period,
  granularityOptions: [...ACCESS_GRANULARITY_OPTIONS],
})

export async function loadCraneParkingStats(
  granularity: DrivingMonitorGranularity,
  anchor: string,
): Promise<ParkingScoreStatsData> {
  const { period, modules } = await loadPeriodModules('parking', granularity, anchor)
  const totalCount = modules.reduce((sum, module) => sum + valueOf(module, 'parkingCount'), 0)
  const scoreWeight = modules.reduce(
    (sum, module) => sum + valueOf(module, 'averageScore') * valueOf(module, 'parkingCount'),
    0,
  )
  const rowTotals = sumRows(modules)
  const rawWeights = [
    rowTotals.find((row) => row.key === 'excellent')?.value ?? 0,
    rowTotals.find((row) => row.key === 'good')?.value ?? 0,
    rowTotals.find((row) => row.key === 'general')?.value ?? 0,
    rowTotals.find((row) => row.key === 'poor')?.value ?? 0,
  ]
  const counts = distributeTotalByWeights(totalCount, rawWeights)

  return {
    ...envelope(granularity, anchor, period),
    items: PARKING_SCORE_GRADES.map((grade, index) => ({
      gradeId: grade.id,
      gradeName: grade.name,
      count: counts[index] ?? 0,
      percentage: totalCount > 0 ? Math.round(((counts[index] ?? 0) / totalCount) * 1000) / 10 : 0,
    })),
    summary: {
      totalCount,
      averageScore: totalCount > 0 ? Math.round((scoreWeight / totalCount) * 10) / 10 : 0,
    },
  }
}

export async function loadCraneFatigueStats(
  granularity: DrivingMonitorGranularity,
  anchor: string,
): Promise<FatigueStatsData> {
  const { period, modules } = await loadPeriodModules('fatigue', granularity, anchor)
  const rows = sumRows(modules)
  const items = rows.map((row) => ({
    craneId: `risk-${row.key}`,
    craneName: row.label,
    fatigueCount: row.value,
  }))
  const max = items.reduce(
    (best, item) => (item.fatigueCount > best.fatigueCount ? item : best),
    items[0] ?? { craneId: 'none', craneName: '—', fatigueCount: 0 },
  )

  return {
    ...envelope(granularity, anchor, period),
    items,
    summary: {
      totalCount: items.reduce((sum, item) => sum + item.fatigueCount, 0),
      maxCraneName: max.craneName,
      maxCount: max.fatigueCount,
      warningCount: modules.reduce((sum, module) => sum + valueOf(module, 'warningCount'), 0),
      highRiskCount: modules.reduce(
        (sum, module) => sum + valueOf(module, 'highRiskDriverCount'),
        0,
      ),
      overLimitCount: modules.reduce((sum, module) => sum + valueOf(module, 'overLimitCount'), 0),
    },
  }
}

const resolveOcclusionStatus = (count: number): OcclusionStatusLevel => {
  if (count >= 4) return 'critical'
  if (count >= 1) return 'warning'
  return 'normal'
}

export async function loadCraneOcclusionStats(
  granularity: DrivingMonitorGranularity,
  anchor: string,
): Promise<OcclusionStatsData> {
  const { period, modules } = await loadPeriodModules('shield', granularity, anchor)
  const items = sumRows(modules).map((row) => ({
    cameraId: `shield-${row.key}`,
    cameraName: row.label,
    occlusionCount: row.value,
    durationMinutes: 0,
    status: resolveOcclusionStatus(row.value),
  }))

  return {
    ...envelope(granularity, anchor, period),
    items,
    summary: {
      totalCount: modules.reduce((sum, module) => sum + valueOf(module, 'warningCount'), 0),
      totalDurationMinutes: 0,
      alertCount: items.filter((item) => item.status !== 'normal').length,
      affectedVehicleCount: modules.reduce(
        (sum, module) => sum + valueOf(module, 'affectedVehicleCount'),
        0,
      ),
      pendingCount: modules.reduce((sum, module) => sum + valueOf(module, 'pendingCount'), 0),
    },
  }
}
