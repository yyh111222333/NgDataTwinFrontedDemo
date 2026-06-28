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

/** 存储状态：正常 / 预警 / 告警 */
export type StorageStatusLevel = 'normal' | 'warning' | 'critical'

/** 存储节点（顺序与图表一致） */
export const STORAGE_MONITOR_NODES = [
  { id: 'core-a', name: '核心区存储A' },
  { id: 'core-b', name: '核心区存储B' },
  { id: 'video-pool', name: '监控录像池' },
  { id: 'backup-pool', name: '备份归档池' },
] as const

export type StorageNodeId = (typeof STORAGE_MONITOR_NODES)[number]['id']

export interface StorageStatusItem {
  storageId: StorageNodeId
  storageName: string
  /** 总容量（TB） */
  totalCapacityTb: number
  /** 已用容量（TB） */
  usedCapacityTb: number
  /** 使用率 0–100，保留一位小数 */
  usagePercent: number
  status: StorageStatusLevel
}

/** GET /api/smart-monitor/storage-status 的 data 载荷（实时快照，无粒度切换） */
export interface StorageStatusData {
  /** 快照时间 ISO8601，如 `2026-06-06T14:30:00+08:00` */
  snapshotAt: string
  /** 展示文案，如 `2026年6月6日 14:30` */
  snapshotLabel: string
  items: StorageStatusItem[]
  summary: {
    totalCapacityTb: number
    usedCapacityTb: number
    /** 平均使用率 0–100 */
    avgUsagePercent: number
    /** status 为 warning 或 critical 的节点数 */
    alertCount: number
  }
}

export type StorageStatusApiResponse = ApiResponse<StorageStatusData>
