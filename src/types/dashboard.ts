/** 火车道状态（与 /api/dashboard/overview 约定一致） */
export type RailStatus = '空闲' | '占用'

export interface DashboardDeviceRecord {
  region: string
  device: string
  online: number
  offline: number
}

export interface DashboardOverviewData {
  onlineAccess: number
  areaTotal: number
  vehiclesOnSite: number
  railStatus: RailStatus
  deviceRecords: DashboardDeviceRecord[]
  deviceRegions: string[]
  deviceTypes: string[]
}

export interface DeviceStatusOption {
  id: string
  name: string
}

export interface DeviceStatusOptionsData {
  regions: DeviceStatusOption[]
  deviceTypes: DeviceStatusOption[]
}

export interface ApiResponse<T = unknown> {
  code: number
  success: boolean
  message: string
  data?: T
  error_type?: string
  errors?: Record<string, string[]>
}

export type DashboardOverviewApiResponse = ApiResponse<DashboardOverviewData>
export type DeviceStatusOptionsApiResponse = ApiResponse<DeviceStatusOptionsData>
