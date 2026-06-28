import type { ApiResponse } from '@/types/dashboard'
import type { DoorFlowDirection } from '@/types/door'

/** 单次人员过门事件（与后端约定一致） */
export interface GateAccessEvent {
  /** 事件唯一 ID，用于增量拉取 cursor */
  eventId: string
  /** 场景门 ID，如 person_A01、tripod_S01；也支持 gate_person_A_01 别名 */
  doorId: string
  /** 过门方向：进 / 出 */
  direction: DoorFlowDirection
  /** 事件发生时间，ISO 8601 */
  occurredAt: string
  /** 可选：人员标识 */
  personId?: string
  /** 可选：人员姓名（展示用） */
  personName?: string
}

export interface GateAccessEventsData {
  /** 自 cursor 之后的新事件（按时间升序） */
  events: GateAccessEvent[]
  /** 本批最后一个 eventId；下次请求带上作 cursor */
  cursor: string
}

export type GateAccessEventsApiResponse = ApiResponse<GateAccessEventsData>

export interface GateAccessEventsQuery {
  /** 上次响应中的 cursor；首次不传 */
  cursor?: string
  /** 可选：限制单批条数，默认 20 */
  limit?: number
}
