import type { ApiResponse } from '@/types/dashboard'

export type VehicleAccessGranularity = 'day' | 'month' | 'year'

/** 车辆通道：六号门～十二号门 */
export const VEHICLE_ACCESS_CHANNELS = [
  { id: '6', name: '六号门' },
  { id: '7', name: '七号门' },
  { id: '8', name: '八号门' },
  { id: '9', name: '九号门' },
  { id: '10', name: '十号门' },
  { id: '11', name: '十一号门' },
  { id: '12', name: '十二号门' },
] as const

export type VehicleChannelId = (typeof VEHICLE_ACCESS_CHANNELS)[number]['id']

export interface VehicleChannelStatItem {
  channelId: VehicleChannelId
  channelName: string
  enterCount: number
  exitCount: number
}

export interface VehicleGranularityOption {
  value: VehicleAccessGranularity
  label: string
}

export interface VehicleChannelStatsData {
  granularity: VehicleAccessGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: VehicleGranularityOption[]
  items: VehicleChannelStatItem[]
  summary: {
    enterTotal: number
    exitTotal: number
    netIn: number
  }
}

export type VehicleChannelStatsApiResponse = ApiResponse<VehicleChannelStatsData>

export interface VehicleChannelStatsQuery {
  granularity: VehicleAccessGranularity
  anchor: string
}

/** 车辆进厂事项（饼图固定 5 类） */
export const VEHICLE_MATTER_TYPES = [
  { id: 'pickup', name: '提货', color: '#5ce8ff' },
  { id: 'delivery', name: '送货', color: '#4ade80' },
  { id: 'repair', name: '维修', color: '#e8c84a' },
  { id: 'temp', name: '临时访问', color: '#f59e0b' },
  { id: 'other', name: '其他', color: '#a78bfa' },
] as const

export type VehicleMatterId = (typeof VEHICLE_MATTER_TYPES)[number]['id']

export interface VehicleMatterStatItem {
  matterId: VehicleMatterId
  matterName: string
  count: number
  percentage: number
}

export interface VehicleMatterStatsData {
  granularity: VehicleAccessGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: VehicleGranularityOption[]
  items: VehicleMatterStatItem[]
  summary: { totalCount: number }
}

export type VehicleMatterStatsApiResponse = ApiResponse<VehicleMatterStatsData>
export type VehicleMatterStatsQuery = VehicleChannelStatsQuery

export interface VehicleTimeStatItem {
  slotId: string
  slotLabel: string
  enterCount: number
  exitCount: number
}

export interface VehicleTimeStatsData {
  granularity: VehicleAccessGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: VehicleGranularityOption[]
  items: VehicleTimeStatItem[]
  summary: {
    enterTotal: number
    exitTotal: number
    peakSlotLabel: string
    peakTotal: number
  }
}

export type VehicleTimeStatsApiResponse = ApiResponse<VehicleTimeStatsData>
export type VehicleTimeStatsQuery = VehicleChannelStatsQuery
