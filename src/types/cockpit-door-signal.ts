import type { DoorFlowDirection } from '@/types/door'

export interface CockpitDoorSignal {
  sourceDoorId: string
  doorId: string
  open: boolean
  direction: DoorFlowDirection
  occurredAt: string
  version: string
  /** 单次通行事件：播放后自动发送关闭状态，使场景恢复待机。 */
  transient?: boolean
  /** 状态复位只更新动画，不重复写入最近事件。 */
  silent?: boolean
}
