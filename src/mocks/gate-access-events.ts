import type { DoorFlowDirection } from '@/types/door'
import type { GateAccessEvent, GateAccessEventsData } from '@/types/gate-access'

const MOCK_PERSON_NAMES = ['张三', '李四', '王五', '赵六', '陈七'] as const

let eventSeq = 0
const eventLog: GateAccessEvent[] = []

const formatEventId = (seq: number) => `evt_${String(seq).padStart(6, '0')}`

const pickRandom = <T>(items: readonly T[]): T | undefined => {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

/** 重置 Mock 事件队列（调试面板停止轮询时可调用） */
export const resetGateAccessEventsMock = () => {
  eventSeq = 0
  eventLog.length = 0
}

/** 构造单条过门事件（Mock / 手动模拟共用） */
export const createGateAccessEvent = (
  doorId: string,
  direction: DoorFlowDirection,
  overrides?: Partial<Pick<GateAccessEvent, 'personId' | 'personName' | 'occurredAt'>>,
): GateAccessEvent => {
  eventSeq += 1
  const personName = overrides?.personName ?? pickRandom(MOCK_PERSON_NAMES)
  return {
    eventId: formatEventId(eventSeq),
    doorId,
    direction,
    occurredAt: overrides?.occurredAt ?? new Date().toISOString(),
    personId: overrides?.personId ?? `P${String(eventSeq).padStart(4, '0')}`,
    personName,
  }
}

/** 写入 Mock 队列并返回事件 */
export const appendGateAccessEventMock = (
  doorId: string,
  direction: DoorFlowDirection,
  overrides?: Partial<Pick<GateAccessEvent, 'personId' | 'personName' | 'occurredAt'>>,
): GateAccessEvent => {
  const event = createGateAccessEvent(doorId, direction, overrides)
  eventLog.push(event)
  return event
}

const compareEventId = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

const sliceAfterCursor = (cursor: string | undefined, limit: number): GateAccessEvent[] => {
  const filtered =
    cursor == null || cursor === ''
      ? [...eventLog]
      : eventLog.filter((evt) => compareEventId(evt.eventId, cursor) > 0)
  return filtered.slice(0, limit)
}

/**
 * 模拟 GET /api/gate-access/events 的数据层。
 * 每次轮询有概率自动生成一条随机过门事件。
 */
export const buildGateAccessEventsMock = (
  doorIds: string[],
  cursor: string | undefined,
  limit = 20,
  options?: { autoGenerate?: boolean },
): GateAccessEventsData => {
  const autoGenerate = options?.autoGenerate !== false
  if (autoGenerate && doorIds.length > 0 && Math.random() < 0.55) {
    const doorId = pickRandom(doorIds)!
    const direction: DoorFlowDirection = Math.random() < 0.5 ? 'in' : 'out'
    appendGateAccessEventMock(doorId, direction)
  }

  const events = sliceAfterCursor(cursor, limit)
  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined
  const latestInLog = eventLog.length > 0 ? eventLog[eventLog.length - 1] : undefined

  return {
    events,
    cursor: lastEvent?.eventId ?? cursor ?? latestInLog?.eventId ?? '',
  }
}
