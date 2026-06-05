import type { ApiResponse } from '@/types/dashboard'
import type { DeviceStatusOption } from '@/types/dashboard'

export type CockpitPanelKey =
  | 'runtime'
  | 'personnel'
  | 'vehicle'
  | 'crane'
  | 'monitor'

export type CockpitPanelTab = {
  key: string
  label: string
}

export type CockpitPanelData = {
  key: string
  title: string
  tabs: CockpitPanelTab[]
  summary?: unknown
  charts?: Record<string, unknown>
  updatedAt?: string
}

export type CockpitPanelApiResponse = ApiResponse<CockpitPanelData>
