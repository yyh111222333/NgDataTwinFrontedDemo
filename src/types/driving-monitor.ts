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

/** 疲劳统计 — 固定 5 台行车 */
export const FATIGUE_CRANE_UNITS = [
  { id: 'c1', name: '1号行车' },
  { id: 'c2', name: '2号行车' },
  { id: 'c3', name: '3号行车' },
  { id: 'c4', name: '4号行车' },
  { id: 'c5', name: '5号行车' },
] as const

export type FatigueCraneId = (typeof FATIGUE_CRANE_UNITS)[number]['id']

export interface FatigueStatItem {
  craneId: FatigueCraneId
  craneName: string
  fatigueCount: number
}

export interface FatigueStatsData {
  granularity: DrivingMonitorGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: DrivingGranularityOption[]
  items: FatigueStatItem[]
  summary: {
    totalCount: number
    maxCraneName: string
    maxCount: number
  }
}

export type FatigueStatsApiResponse = ApiResponse<FatigueStatsData>
export type FatigueStatsQuery = ParkingScoreStatsQuery

/** 遮挡监测 — 固定 6 路摄像头 */
export type OcclusionStatusLevel = 'normal' | 'warning' | 'critical'

export const OCCLUSION_CAMERA_NODES = [
  { id: 'cam1', name: '1号摄像头' },
  { id: 'cam2', name: '2号摄像头' },
  { id: 'cam3', name: '3号摄像头' },
  { id: 'cam4', name: '4号摄像头' },
  { id: 'cam5', name: '5号摄像头' },
  { id: 'cam6', name: '6号摄像头' },
] as const

export type OcclusionCameraId = (typeof OCCLUSION_CAMERA_NODES)[number]['id']

export interface OcclusionStatItem {
  cameraId: OcclusionCameraId
  cameraName: string
  occlusionCount: number
  durationMinutes: number
  status: OcclusionStatusLevel
}

export interface OcclusionStatsData {
  granularity: DrivingMonitorGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: DrivingGranularityOption[]
  items: OcclusionStatItem[]
  summary: {
    totalCount: number
    totalDurationMinutes: number
    alertCount: number
  }
}

export type OcclusionStatsApiResponse = ApiResponse<OcclusionStatsData>
export type OcclusionStatsQuery = ParkingScoreStatsQuery
