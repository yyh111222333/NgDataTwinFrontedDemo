import { apiClient } from '@/api/client'
import { normalizeSceneDoorId } from '@/api/gate-access-normalize'
import { TRAIN_BARRIER_SCENE_DOOR_IDS } from '@/config/cockpit-door-signal-map'
import type { DoorFlowDirection } from '@/types/door'
import type {
  TrainBarrierStatusResponse,
  TrainBarrierStatusSnapshot,
} from '@/types/train-barrier'

const TRAIN_BARRIER_STATUS_URL = '/train-barrier-api/stats'

export const getTrainBarrierStatus = async (): Promise<TrainBarrierStatusResponse> => {
  const { data } = await apiClient.get<TrainBarrierStatusResponse>(TRAIN_BARRIER_STATUS_URL, {
    timeout: 5_000,
  })
  return data
}

const barrierDirection = (open: boolean): DoorFlowDirection => (open ? 'in' : 'out')

export const buildTrainBarrierStatusSnapshot = (
  status: TrainBarrierStatusResponse,
  validDoorIds: ReadonlySet<string>,
): TrainBarrierStatusSnapshot => {
  const control = status.control ?? {}
  const phase = String(control.phase ?? '').toLowerCase()
  const opening = phase === 'opening'
  const doorStates: Record<string, boolean> = {}
  const doorFlowDirections: Record<string, DoorFlowDirection> = {}
  const controlledDoorIds: string[] = []

  Object.entries(TRAIN_BARRIER_SCENE_DOOR_IDS).forEach(([deviceIp, configuredDoorId]) => {
    const doorId = normalizeSceneDoorId(configuredDoorId, validDoorIds)
    if (!doorId) return

    // 开杆阶段两侧同步打开；关杆阶段按各设备 DI1 关到位反馈分别复位。
    const open = opening || control.limit_inputs?.[deviceIp] === true
    doorStates[doorId] = open
    doorFlowDirections[doorId] = barrierDirection(open)
    controlledDoorIds.push(doorId)
  })

  const railOccupied =
    status.active === true ||
    control.trigger_active === true ||
    (phase !== '' && phase !== 'idle' && phase !== 'waiting_reset')

  return {
    doorStates,
    doorFlowDirections,
    controlledDoorIds,
    railStatus: railOccupied ? '占用' : '空闲',
  }
}
