import type { ApiResponse } from '@/types/dashboard'

/** 智慧监控 — 统计粒度 */
export type SmartMonitorGranularity = 'day' | 'month' | 'year'

/** 危险事件类型（饼图固定 6 类，顺序与图例一致） */
export const DANGER_EVENT_TYPES = [
  { id: 'A', name: '事件A', color: '#5ce8ff' },
  { id: 'B', name: '事件B', color: '#4ade80' },
  { id: 'C', name: '事件C', color: '#e8c84a' },
  { id: 'D', name: '事件D', color: '#f59e0b' },
  { id: 'E', name: '事件E', color: '#f87171' },
  { id: 'F', name: '事件F', color: '#a78bfa' },
] as const

export type DangerEventTypeId = (typeof DANGER_EVENT_TYPES)[number]['id']

export interface DangerEventStatItem {
  eventId: DangerEventTypeId
  eventName: string
  /** 该类型事件发生次数 */
  count: number
  /** 占比 0–100，保留一位小数 */
  percentage: number
}

export interface SmartMonitorGranularityOption {
  value: SmartMonitorGranularity
  label: string
}

export interface DangerEventStatsData {
  granularity: SmartMonitorGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: SmartMonitorGranularityOption[]
  items: DangerEventStatItem[]
  summary: {
    /** 统计周期内危险事件总数 */
    totalCount: number
    /** 高风险事件数（事件 E + F） */
    highRiskCount: number
  }
}

export type DangerEventStatsApiResponse = ApiResponse<DangerEventStatsData>

export interface DangerEventStatsQuery {
  granularity: SmartMonitorGranularity
  anchor: string
}
