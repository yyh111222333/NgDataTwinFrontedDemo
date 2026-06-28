import { normalizeSceneDoorId } from '@/api/gate-access-normalize'
import type { GateAccessEvent } from '@/types/gate-access'
import type { DoorFlowDirection } from '@/types/door'

export type GateDoorStateSlice = {
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
}

/** 将单条过门事件应用到门禁状态：先设方向，再 toggle 以触发动画 */
export const applyGateAccessEvent = (
  state: GateDoorStateSlice,
  event: GateAccessEvent,
  validDoorIds: ReadonlySet<string>,
): GateDoorStateSlice => {
  const doorId = normalizeSceneDoorId(event.doorId, validDoorIds)
  if (!doorId) return state

  return {
    doorFlowDirections: {
      ...state.doorFlowDirections,
      [doorId]: event.direction,
    },
    doorStates: {
      ...state.doorStates,
      [doorId]: !state.doorStates[doorId],
    },
  }
}

export const applyGateAccessEvents = (
  state: GateDoorStateSlice,
  events: GateAccessEvent[],
  validDoorIds: ReadonlySet<string>,
): GateDoorStateSlice =>
  events.reduce(
    (acc, event) => applyGateAccessEvent(acc, event, validDoorIds),
    state,
  )
