import type { ApiResponse } from '@/types/dashboard'

/** 行车监测 — 统计粒度 */
export type DrivingMonitorGranularity = 'day' | 'month' | 'year'

/** 停车评分等级（饼图固定 5 档，顺序与图例一致） */
export const PARKING_SCORE_GRADES = [
  { id: 'excellent', name: '优秀(≥90分)', color: '#5ce8ff' },
  { id: 'good', name: '良好(80-89分)', color: '#4ade80' },
  { id: 'pass', name: '合格(70-79分)', color: '#e8c84a' },
  { id: 'warning', name: '预警(60-69分)', color: '#f59e0b' },
  { id: 'fail', name: '不合格(<60分)', color: '#f87171' },
] as const

export type ParkingScoreGradeId = (typeof PARKING_SCORE_GRADES)[number]['id']

export interface ParkingScoreStatItem {
  gradeId: ParkingScoreGradeId
  gradeName: string
  /** 该档位停车记录数 */
  count: number
  /** 占比 0–100，保留一位小数 */
  percentage: number
}

export interface DrivingGranularityOption {
  value: DrivingMonitorGranularity
  label: string
}

export interface ParkingScoreStatsData {
  granularity: DrivingMonitorGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: DrivingGranularityOption[]
  items: ParkingScoreStatItem[]
  summary: {
    /** 统计周期内停车记录总数 */
    totalCount: number
    /** 加权平均分，0–100 */
    averageScore: number
  }
}

export type ParkingScoreStatsApiResponse = ApiResponse<ParkingScoreStatsData>

export interface ParkingScoreStatsQuery {
  granularity: DrivingMonitorGranularity
  anchor: string
}
