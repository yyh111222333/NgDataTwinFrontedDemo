import { apiClient } from '@/api/client'
import { normalizeSceneDoorId } from '@/api/gate-access-normalize'
import type { DoorFlowDirection } from '@/types/door'
import type { GateAccessEvent } from '@/types/gate-access'
import type {
  RelayDoorDevice,
  RelayDoorStatusResponse,
  RelayDoorStatusSnapshot,
} from '@/types/relay-door-status'

const RELAY_STATUS_URL = '/relay-api/status'

// 10.13.0.8:18999 devices -> scene SVG door ids.
// The map is keyed by both relay device id and IP so replacing either side is explicit.
const RELAY_DEVICE_SCENE_DOOR_IDS: Record<string, string> = {
  e45b70e6ab41: 'person_K01',
  '192.168.52.101': 'person_K01',
  cdc79a777257: 'person_K02',
  '192.168.52.102': 'person_K02',
  f5b6a0244f1e: 'person_K03',
  '192.168.52.103': 'person_K03',
  a67cefbceb2c: 'person_K04',
  '192.168.53.101': 'person_K04',
  '4d71a1795bc6': 'person_K05',
  '192.168.53.104': 'person_K05',
  '3851f4cbe259': 'person_K06',
  '192.168.53.105': 'person_K06',
  bba6a01302f1: 'person_K07',
  '192.168.53.107': 'person_K07',

  '0dbb2b35d3e4': 'person_J01',
  '192.168.53.102': 'person_J01',
  c32e2c1694c5: 'person_J02',
  '192.168.53.103': 'person_J02',
  c2e533ec288a: 'person_J03',
  '192.168.53.106': 'person_J03',
  fc79ef90c5cb: 'person_J04',
  '192.168.53.108': 'person_J04',

  e480864dc6df: 'person_E01',
  '192.168.53.110': 'person_E01',
  e5cbb149e2e5: 'person_E02',
  '192.168.52.107': 'person_E02',
  '81784d6ce0ac': 'person_E03',
  '192.168.52.110': 'person_E03',
  b1cd5314732a: 'person_E04',
  '192.168.53.115': 'person_E04',
  c0b94b72df65: 'person_E05',
  '192.168.53.117': 'person_E05',

  b1f3de61b6a9: 'person_D01',
  '192.168.53.111': 'person_D01',
  '99355ee0120b': 'person_D02',
  '192.168.53.114': 'person_D02',
  ab5b8644a8ed: 'person_D03',
  '192.168.53.116': 'person_D03',

  '361e75d51baa': 'person_F01',
  '192.168.52.108': 'person_F01',
  '937485025d28': 'person_F02',
  '192.168.52.109': 'person_F02',
}

const truthyBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  return null
}

export const getRelayDoorStatus = async (): Promise<RelayDoorStatusResponse> => {
  const { data } = await apiClient.get<RelayDoorStatusResponse>(RELAY_STATUS_URL, {
    timeout: 5_000,
  })
  return data
}

export const resolveRelaySceneDoorId = (
  device: RelayDoorDevice,
  validDoorIds: ReadonlySet<string>,
): string | null => {
  const extendedDevice = device as RelayDoorDevice & {
    sceneDoorId?: unknown
    scene_door_id?: unknown
    doorId?: unknown
  }
  const explicitDoorId =
    typeof extendedDevice.sceneDoorId === 'string'
      ? extendedDevice.sceneDoorId
      : typeof extendedDevice.scene_door_id === 'string'
        ? extendedDevice.scene_door_id
        : typeof extendedDevice.doorId === 'string'
          ? extendedDevice.doorId
          : null

  if (explicitDoorId) {
    return normalizeSceneDoorId(explicitDoorId, validDoorIds)
  }

  const mapped = RELAY_DEVICE_SCENE_DOOR_IDS[device.id] ?? RELAY_DEVICE_SCENE_DOOR_IDS[device.ip]
  if (!mapped) return null
  return normalizeSceneDoorId(mapped, validDoorIds)
}

export const resolveRelayDoorActive = (device: RelayDoorDevice): boolean | null => {
  const inputActive = truthyBoolean(device.input_active)
  const outputActive = truthyBoolean(device.outputs?.['2'])
  if (inputActive === true || outputActive === true) return true
  if (inputActive !== null || outputActive !== null) return false
  return null
}

const relayDirection = (active: boolean): DoorFlowDirection => (active ? 'in' : 'out')

const relayEventLabel = (device: RelayDoorDevice, active: boolean) => {
  const name = device.name || device.ip
  return `${name} ${active ? '门开' : '门关'}`
}

export const buildRelayDoorStatusSnapshot = (
  status: RelayDoorStatusResponse,
  previousDoorStates: Readonly<Record<string, boolean | undefined>>,
  validDoorIds: ReadonlySet<string>,
): RelayDoorStatusSnapshot => {
  const doorStates: Record<string, boolean> = {}
  const doorFlowDirections: Record<string, DoorFlowDirection> = {}
  const controlledDoorIds = new Set<string>()
  const events: GateAccessEvent[] = []
  const devices = status.devices ?? []
  const now = Date.now()

  devices.forEach((device, index) => {
    const doorId = resolveRelaySceneDoorId(device, validDoorIds)
    const active = resolveRelayDoorActive(device)
    if (!doorId || active === null) return

    const direction = relayDirection(active)
    doorStates[doorId] = active
    doorFlowDirections[doorId] = direction
    controlledDoorIds.add(doorId)

    const prev = previousDoorStates[doorId]
    if (prev === active || (prev === undefined && active === false)) return

    events.push({
      eventId: `relay_${device.id || device.ip}_${now}_${index}`,
      doorId,
      direction,
      occurredAt: new Date(now).toISOString(),
      personId: device.id,
      personName: relayEventLabel(device, active),
    })
  })

  return {
    doorStates,
    doorFlowDirections,
    controlledDoorIds: Array.from(controlledDoorIds),
    events,
    mappedCount: controlledDoorIds.size,
    totalCount: devices.length,
  }
}
