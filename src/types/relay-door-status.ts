import type { DoorFlowDirection } from '@/types/door'
import type { GateAccessEvent } from '@/types/gate-access'

export interface RelayDoorDevice {
  id: string
  ip: string
  name?: string
  group_name?: string | null
  input_active?: boolean | null
  outputs?: Record<string, boolean | null | undefined> | null
  connected?: boolean
}

export interface RelayDoorStatusResponse {
  devices?: RelayDoorDevice[]
  running?: boolean
}

export interface RelayDoorStatusSnapshot {
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
  controlledDoorIds: string[]
  events: GateAccessEvent[]
  mappedCount: number
  totalCount: number
}
