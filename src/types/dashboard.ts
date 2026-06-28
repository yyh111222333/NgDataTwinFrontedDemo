/** 火车道状态（与 /api/dashboard/overview 约定一致） */
export type RailStatus = '空闲' | '占用'

export interface DashboardDeviceRecord {
  region: string
  device: string
  online: number
  /** 异常台数 */
  abnormal: number
  offline: number
}

export interface DashboardOverviewData {
  onlineAccess: number
  areaTotal: number
  vehiclesOnSite: number
  /** 展示用中文：空闲 | 占用 */
  railStatus: RailStatus
  /** 异常警告数量（KPI 第五项） */
  alarmCount: number
  deviceRecords: DashboardDeviceRecord[]
  deviceRegions: string[]
  deviceTypes: string[]
  /** 可选：数据更新时间 ISO 8601 */
  updatedAt?: string
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
