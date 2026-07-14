import { apiClient } from '@/api/client'
import { normalizeGateAccessDirection, normalizeSceneDoorId } from '@/api/gate-access-normalize'
import { COCKPIT_DOOR_SIGNAL_ID_MAP } from '@/config/cockpit-door-signal-map'
import type {
  CockpitDoorSignal,
  CockpitDoorStateData,
  CockpitDoorStateItem,
  CockpitDoorStateResponse,
} from '@/types/cockpit-door-signal'
import type { DoorFlowDirection } from '@/types/door'

const COCKPIT_DOOR_STATE_URL = '/api/cockpit/v1/door-states'

const normalizeBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value !== 'string') return null

  const key = value.trim().toLowerCase()
  if (['1', 'true', 'open', 'opened', 'on', '开', '开启'].includes(key)) return true
  if (['0', 'false', 'close', 'closed', 'off', '关', '关闭'].includes(key)) return false
  return null
}

const normalizeDirection = (value: unknown): DoorFlowDirection => {
  if (typeof value !== 'string' || value.trim().length === 0) return 'out'
  try {
    return normalizeGateAccessDirection(value)
  } catch {
    return 'out'
  }
}

const isFullheightOrBarrier = (doorId: string) =>
  doorId.startsWith('fullheight_') ||
  doorId.startsWith('vehicleBarrier_') ||
  doorId.startsWith('trainBarrier_')

export const resolveCockpitSignalDoorId = (
  sourceDoorId: string,
  validDoorIds: ReadonlySet<string>,
): string | null => {
  const mapped = COCKPIT_DOOR_SIGNAL_ID_MAP[sourceDoorId]
  if (mapped && validDoorIds.has(mapped)) return mapped

  const normalized = normalizeSceneDoorId(sourceDoorId, validDoorIds)
  return normalized && isFullheightOrBarrier(normalized) ? normalized : null
}

const buildFallbackItems = (data: CockpitDoorStateData): CockpitDoorStateItem[] =>
  Object.entries(data.states ?? {}).map(([doorId, open]) => ({
    doorId,
    open,
    flowDirection: data.flowDirections?.[doorId],
  }))

export const normalizeCockpitDoorSignals = (
  response: CockpitDoorStateResponse,
  validDoorIds: ReadonlySet<string>,
): CockpitDoorSignal[] => {
  const data = response.data
  if (!data) return []

  const items = data.items?.length ? data.items : buildFallbackItems(data)
  return items.flatMap((item): CockpitDoorSignal[] => {
    if (item.online === false) return []

    const sourceDoorId = item.doorId || item.deviceId || item.name || ''
    if (!sourceDoorId) return []

    const doorId = resolveCockpitSignalDoorId(sourceDoorId, validDoorIds)
    const open = normalizeBoolean(item.open)
    if (!doorId || open === null) return []

    const rawDirection = item.flowDirection ?? data.flowDirections?.[sourceDoorId]
    const direction = normalizeDirection(rawDirection)
    const occurredAt = item.updatedAt || data.updatedAt || ''
    return [
      {
        sourceDoorId,
        doorId,
        open,
        direction,
        occurredAt,
        version: `${occurredAt}|${open ? 1 : 0}|${direction}`,
      },
    ]
  })
}

export const getCockpitDoorSignals = async (
  validDoorIds: ReadonlySet<string>,
): Promise<CockpitDoorSignal[]> => {
  const { data } = await apiClient.get<CockpitDoorStateResponse>(COCKPIT_DOOR_STATE_URL, {
    timeout: 5_000,
  })
  if (data.success === false || !data.data) {
    throw new Error(data.message || '获取全高闸和道闸信号失败')
  }
  return normalizeCockpitDoorSignals(data, validDoorIds)
}
