import type { GateAccessEvent, GateAccessEventsData } from '@/types/gate-access'

const MOCK_PERSON_NAMES = ['张三', '李四', '王五', '赵六', '访客A', '访客B'] as const

let mockSeq = 0
const mockEventLog: GateAccessEvent[] = []

const pickMockDoorId = (doorIds: string[]) => {
  const preferred = doorIds.filter(
    (id) =>
      id.startsWith('person_') ||
      id.startsWith('tripod_') ||
      id.startsWith('fullheight_'),
  )
  const pool = preferred.length > 0 ? preferred : doorIds
  return pool[mockSeq % pool.length] ?? doorIds[0] ?? 'person_A01'
}

const sliceAfterCursor = (cursor?: string) => {
  if (!cursor) return 0
  const idx = mockEventLog.findIndex((evt) => evt.eventId === cursor)
  return idx === -1 ? 0 : idx + 1
}

/** 模拟后端增量推送：每次轮询有概率产生 1 条过门事件 */
export const buildGateAccessEventsMock = (
  doorIds: string[],
  cursor?: string,
  limit = 20,
): GateAccessEventsData => {
  if (doorIds.length > 0 && Math.random() < 0.45) {
    mockSeq += 1
    const doorId = pickMockDoorId(doorIds)
    mockEventLog.push({
      eventId: `mock_evt_${String(mockSeq).padStart(6, '0')}`,
      doorId,
      direction: mockSeq % 2 === 0 ? 'in' : 'out',
      occurredAt: new Date().toISOString(),
      personId: `P${String(1000 + mockSeq)}`,
      personName: MOCK_PERSON_NAMES[mockSeq % MOCK_PERSON_NAMES.length],
    })
  }

  const start = sliceAfterCursor(cursor)
  const events = mockEventLog.slice(start, start + limit)
  const last = mockEventLog[mockEventLog.length - 1]

  return {
    events,
    cursor: last?.eventId ?? cursor ?? '',
  }
}

/** 测试或热更新时重置 Mock 事件队列 */
export const resetGateAccessEventsMock = () => {
  mockSeq = 0
  mockEventLog.length = 0
}
