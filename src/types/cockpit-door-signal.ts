import type { DoorFlowDirection } from '@/types/door'

export interface CockpitDoorStateItem {
  deviceId?: string
  doorId?: string
  name?: string
  open?: boolean | number | string | null
  flowDirection?: string | null
  online?: boolean
  updatedAt?: string | null
}

export interface CockpitDoorStateData {
  items?: CockpitDoorStateItem[]
  states?: Record<string, boolean | number | string | null | undefined>
  flowDirections?: Record<string, string | null | undefined>
  updatedAt?: string
}

export interface CockpitDoorStateResponse {
  code?: number
  success?: boolean
  message?: string
  data?: CockpitDoorStateData
}

export interface CockpitDoorSignal {
  sourceDoorId: string
  doorId: string
  open: boolean
  direction: DoorFlowDirection
  occurredAt: string
  version: string
}
