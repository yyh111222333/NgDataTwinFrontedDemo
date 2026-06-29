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

/**
 * 真实 API 返回体示例（GET /api/gate-access/events?cursor=evt_000003&limit=20）
 *
 * ```json
 * {
 *   "code": 0,
 *   "success": true,
 *   "message": "ok",
 *   "data": {
 *     "events": [
 *       {
 *         "eventId": "evt_000004",
 *         "doorId": "person_A01",
 *         "direction": "in",
 *         "occurredAt": "2026-05-29T10:15:32.000Z",
 *         "personId": "P1001",
 *         "personName": "张三"
 *       },
 *       {
 *         "eventId": "evt_000005",
 *         "doorId": "tripod_S01",
 *         "direction": "out",
 *         "occurredAt": "2026-05-29T10:15:35.000Z"
 *       }
 *     ],
 *     "cursor": "evt_000005"
 *   }
 * }
 * ```
 *
 * direction 也支持别名：in/enter/entry/进，out/exit/leave/出。
 * doorId 支持场景 ID（person_A01）或别名（gate_person_A_01）。
 */
export const GATE_ACCESS_EVENTS_API_EXAMPLE = {
  code: 0,
  success: true,
  message: 'ok',
  data: {
    events: [
      {
        eventId: 'evt_000004',
        doorId: 'person_A01',
        direction: 'in' as const,
        occurredAt: '2026-05-29T10:15:32.000Z',
        personId: 'P1001',
        personName: '张三',
      },
      {
        eventId: 'evt_000005',
        doorId: 'tripod_S01',
        direction: 'out' as const,
        occurredAt: '2026-05-29T10:15:35.000Z',
      },
    ],
    cursor: 'evt_000005',
  },
} as const satisfies GateAccessEventsApiResponse
