import { apiClient } from '@/api/client'
import {
  normalizeGateAccessDirection,
  normalizeSceneDoorId,
} from '@/api/gate-access-normalize'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildGateAccessEventsMock } from '@/mocks/gate-access-events'
import type {
  GateAccessEvent,
  GateAccessEventsApiResponse,
  GateAccessEventsData,
  GateAccessEventsQuery,
} from '@/types/gate-access'

export type GateAccessEventsOptions = GateAccessEventsQuery & {
  useMock?: boolean
  /** Mock 模式下用于随机选门的合法 ID 列表 */
  animatableDoorIds?: string[]
  /** 校验 doorId 时的合法集合；真实 API 也建议传入以过滤未知门 */
  validDoorIds?: ReadonlySet<string>
}

const normalizeEvent = (
  raw: GateAccessEvent,
  validDoorIds?: ReadonlySet<string>,
): GateAccessEvent | null => {
  const doorId =
    validDoorIds != null
      ? normalizeSceneDoorId(raw.doorId, validDoorIds) ?? raw.doorId
      : raw.doorId

  if (validDoorIds != null && !validDoorIds.has(doorId)) {
    return null
  }

  return {
    ...raw,
    doorId,
    direction: normalizeGateAccessDirection(raw.direction),
  }
}

const normalizeEventsPayload = (
  data: GateAccessEventsData,
  validDoorIds?: ReadonlySet<string>,
): GateAccessEventsData => {
  const events = data.events
    .map((evt) => normalizeEvent(evt, validDoorIds))
    .filter((evt): evt is GateAccessEvent => evt != null)

  return {
    events,
    cursor: data.cursor,
  }
}

/**
 * 增量拉取人员过门事件（轮询）。
 *
 * GET /api/gate-access/events?cursor=evt_xxx&limit=20
 */
export async function getGateAccessEvents(
  options?: GateAccessEventsOptions,
): Promise<GateAccessEventsData> {
  const limit = options?.limit ?? 20

  if (resolveUseMock(options)) {
    const doorIds = options?.animatableDoorIds ?? []
    return normalizeEventsPayload(
      buildGateAccessEventsMock(doorIds, options?.cursor, limit),
      options?.validDoorIds,
    )
  }

  const { data: body } = await apiClient.get<GateAccessEventsApiResponse>(
    '/api/gate-access/events',
    {
      params: {
        cursor: options?.cursor,
        limit,
      },
    },
  )

  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取门禁过门事件失败')
  }

  return normalizeEventsPayload(body.data, options?.validDoorIds)
}
