import type { ApiResponse } from '@/types/dashboard'

export type PersonnelAccessGranularity = 'day' | 'month' | 'year'

export interface PersonnelStatsQuery {
  granularity: PersonnelAccessGranularity
  anchor: string
}

export interface PersonnelGranularityOption {
  value: PersonnelAccessGranularity
  label: string
}

export interface PersonnelStatsMeta {
  granularity: PersonnelAccessGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: PersonnelGranularityOption[]
  coverageStartAt: string | null
  partial: boolean
  observedAt: string
  source: 'K30'
}

export interface PersonnelSummaryData {
  departmentCount: number
  staffCount: number
  leaveStaffCount: number
  onlineDeviceCount: number
  offlineDeviceCount: number
  todayPassCount: number
  observedAt: string
  source: 'K30'
  stale: boolean
  message?: string
}

export type PersonnelSummaryApiResponse = ApiResponse<PersonnelSummaryData>

export interface PersonnelDeviceStatItem {
  deviceId: string
  deviceName: string
  enterCount: number
  exitCount: number
  unknownCount: number
  totalCount: number
}

export interface PersonnelDeviceStatsData extends PersonnelStatsMeta {
  items: PersonnelDeviceStatItem[]
  summary: {
    enterTotal: number
    exitTotal: number
    unknownTotal: number
    totalCount: number
  }
}

export type PersonnelDeviceStatsApiResponse = ApiResponse<PersonnelDeviceStatsData>

export interface PersonnelDepartmentStatItem {
  departmentId: string
  departmentName: string
  count: number
  percentage: number
}

export interface PersonnelDepartmentStatsData extends PersonnelStatsMeta {
  items: PersonnelDepartmentStatItem[]
  summary: { totalCount: number }
}

export type PersonnelDepartmentStatsApiResponse = ApiResponse<PersonnelDepartmentStatsData>

export const PERSONNEL_DEPARTMENT_COLORS = [
  '#5ce8ff',
  '#4ade80',
  '#e8c84a',
  '#f59e0b',
  '#a78bfa',
  '#fb7185',
  '#60a5fa',
] as const

export interface PersonnelTimeStatItem {
  slotId: string
  slotLabel: string
  enterCount: number
  exitCount: number
  unknownCount: number
  totalCount: number
}

export interface PersonnelTimeStatsData extends PersonnelStatsMeta {
  nativeDailyTotal: boolean
  items: PersonnelTimeStatItem[]
  summary: {
    enterTotal: number
    exitTotal: number
    unknownTotal: number
    totalCount: number
    peakSlotLabel: string
    peakTotal: number
  }
}

export type PersonnelTimeStatsApiResponse = ApiResponse<PersonnelTimeStatsData>
