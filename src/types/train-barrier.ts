import type { DoorFlowDirection } from '@/types/door'
import type { RailStatus } from '@/types/dashboard'

export interface TrainBarrierDeviceResponse {
  online?: boolean
  last_success_at?: string | null
  response_ms?: number | null
  last_error?: string | null
}

export interface TrainBarrierControlStatus {
  phase?: string
  trigger_active?: boolean
  limit_inputs?: Record<string, boolean | null | undefined>
  device_responses?: Record<string, TrainBarrierDeviceResponse | undefined>
}

export interface TrainBarrierStatusResponse {
  active?: boolean
  control?: TrainBarrierControlStatus
}

export interface TrainBarrierStatusSnapshot {
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
  controlledDoorIds: string[]
  railStatus: RailStatus
}
