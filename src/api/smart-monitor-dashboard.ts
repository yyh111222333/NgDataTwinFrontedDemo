import { apiClient } from '@/api/client'
import type {
  SmartMonitorAlarmItem,
  SmartMonitorAlarmRankItem,
  SmartMonitorDashboardData,
  SmartMonitorDashboardResponse,
  SmartMonitorTrendPoint,
} from '@/types/smart-monitor-dashboard'

const CACHE_TTL_MS = 5_000

let cachedData: SmartMonitorDashboardData | null = null
let cachedAt = 0
let pendingRequest: Promise<SmartMonitorDashboardData> | null = null

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeTrend = (value: unknown): SmartMonitorTrendPoint[] => {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row = item as Partial<SmartMonitorTrendPoint>
    return { x: numberValue(row.x), y: numberValue(row.y) }
  })
}

const normalizeRank = (value: unknown): SmartMonitorAlarmRankItem[] => {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const row = item as Partial<SmartMonitorAlarmRankItem>
    return {
      code: String(row.code ?? `monitor-event-${index + 1}`),
      name: String(row.name ?? `告警类型${index + 1}`),
      count: numberValue(row.count),
    }
  })
}

const normalizeAlarmData = (value: unknown): SmartMonitorAlarmItem[] => {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    const row = item as Partial<SmartMonitorAlarmItem>
    return {
      id: numberValue(row.id),
      code: String(row.code ?? `monitor-alarm-${index + 1}`),
      stream_nickname: String(row.stream_nickname ?? ''),
      flow_name: String(row.flow_name ?? ''),
      state: numberValue(row.state),
      create_time_str: String(row.create_time_str ?? ''),
    }
  })
}

const normalizeDashboardData = (
  info: Partial<SmartMonitorDashboardData> | undefined,
): SmartMonitorDashboardData => ({
  last7DayChartData: normalizeTrend(info?.last7DayChartData),
  last7DayRankData: normalizeRank(info?.last7DayRankData),
  todayAlarmTotalCount: numberValue(info?.todayAlarmTotalCount),
  todayAlarmHandleCount: numberValue(info?.todayAlarmHandleCount),
  todayAlarmUnHandleCount: numberValue(info?.todayAlarmUnHandleCount),
  streamTotalCount: numberValue(info?.streamTotalCount),
  streamOnlineCount: numberValue(info?.streamOnlineCount),
  alarmData: normalizeAlarmData(info?.alarmData),
})

export async function getSmartMonitorDashboard(options?: {
  force?: boolean
}): Promise<SmartMonitorDashboardData> {
  const now = Date.now()
  if (!options?.force && cachedData && now - cachedAt < CACHE_TTL_MS) return cachedData
  if (pendingRequest) return pendingRequest

  pendingRequest = apiClient
    .get<SmartMonitorDashboardResponse>('/monitor-api/index/openDashboardData', {
      params: { alarm_rank_size: 8, alarm_size: 10 },
      timeout: 5_000,
    })
    .then(({ data: body }) => {
      if (body.code !== 1000 || !body.info) {
        throw new Error(body.msg || '获取智慧监控概况失败')
      }
      cachedData = normalizeDashboardData(body.info)
      cachedAt = Date.now()
      return cachedData
    })
    .finally(() => {
      pendingRequest = null
    })

  return pendingRequest
}
