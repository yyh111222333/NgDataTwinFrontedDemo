import type { ApiResponse } from '@/types/dashboard'

export type VehicleAccessGranularity = 'day' | 'month' | 'year'

/** 当前已接入车辆平台的通道。 */
export const VEHICLE_ACCESS_CHANNELS = [
  { id: '7', name: '七号门' },
  { id: '8', name: '八号门' },
  { id: '9', name: '九号门' },
  { id: '10', name: '十号门' },
  { id: '11', name: '十一号门' },
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

/** 车辆平台返回的车牌类型。 */
export const VEHICLE_MATTER_TYPES = [
  { id: 'yellow', name: '黄牌车', color: '#e8c84a' },
  { id: 'blue', name: '蓝牌车', color: '#5ce8ff' },
  { id: 'green', name: '绿牌车', color: '#4ade80' },
  { id: 'unlicensed', name: '无牌车', color: '#f59e0b' },
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
