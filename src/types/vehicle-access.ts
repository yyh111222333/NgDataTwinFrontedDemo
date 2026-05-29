import type { ApiResponse } from '@/types/dashboard'

export type VehicleAccessGranularity = 'day' | 'month' | 'year'

/** 车辆通道：六号门～十一号门 */
export const VEHICLE_ACCESS_CHANNELS = [
  { id: '6', name: '六号门' },
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
