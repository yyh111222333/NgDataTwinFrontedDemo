import { apiClient } from '@/api/client'
import {
  PERSONNEL_DEVICE_SCENE_DOOR_IDS,
  VEHICLE_GATE_SCENE_DOOR_IDS,
} from '@/config/cockpit-door-signal-map'
import type { CockpitDoorSignal } from '@/types/cockpit-door-signal'
import type { DoorFlowDirection } from '@/types/door'

const PERSONNEL_EVENT_URL = '/gateway/personnel/ControllerMonitor/GetNowInfo'
const VEHICLE_EVENT_URL = '/parking-api/public/events'

type PersonnelEvent = {
  AddTime?: string | null
  DeviceNo?: string | null
  OutInType?: number | string | null
  Remark?: string | null
}

type PersonnelEventResponse = {
  Success?: boolean
  Message?: string
  Data?: PersonnelEvent[]
}

type VehicleOrderResponse = {
  items?: VehicleEvent[]
}

type VehicleEvent = {
  id: number
  source_key: string
  gate_no: number
  direction: 'in' | 'out'
  captured_at: string
}

const PERSONNEL_PASSAGE_REMARK = /智能识别|刷卡开门|按钮开门|远程开门|超级密码开门/

const normalizeOccurredAt = (value: string): string => {
  const parsed = new Date(`${value.trim().replace(' ', 'T')}+08:00`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

const getPersonnelSignals = async (
  validDoorIds: ReadonlySet<string>,
): Promise<CockpitDoorSignal[]> => {
  const deviceNumbers = Object.keys(PERSONNEL_DEVICE_SCENE_DOOR_IDS)
  if (deviceNumbers.length === 0) return []

  const { data } = await apiClient.get<PersonnelEventResponse>(PERSONNEL_EVENT_URL, {
    params: { Door_IDs: `${deviceNumbers.join(',')},` },
    timeout: 8_000,
  })
  if (!data.Success || !Array.isArray(data.Data)) {
    throw new Error(data.Message || '获取人员子系统实时事件失败')
  }

  const latestByDevice = new Map<string, PersonnelEvent>()
  data.Data.forEach((event) => {
    const deviceNo = event.DeviceNo?.trim()
    const remark = event.Remark?.trim() ?? ''
    if (!deviceNo || !event.AddTime || !PERSONNEL_PASSAGE_REMARK.test(remark)) return

    const current = latestByDevice.get(deviceNo)
    if (!current?.AddTime || event.AddTime > current.AddTime) {
      latestByDevice.set(deviceNo, event)
    }
  })

  return [...latestByDevice.entries()].flatMap(([deviceNo, event]) => {
    const doorId = PERSONNEL_DEVICE_SCENE_DOOR_IDS[deviceNo]
    if (!doorId || !validDoorIds.has(doorId) || !event.AddTime) return []

    const direction: DoorFlowDirection = Number(event.OutInType) === 2 ? 'out' : 'in'
    const occurredAt = normalizeOccurredAt(event.AddTime)
    return [
      {
        sourceDoorId: `personnel:${deviceNo}`,
        doorId,
        open: true,
        direction,
        occurredAt,
        version: `${event.AddTime}|${event.Remark ?? ''}`,
        transient: true,
      },
    ]
  })
}

const getVehicleSignals = async (
  validDoorIds: ReadonlySet<string>,
): Promise<CockpitDoorSignal[]> => {
  const { data } = await apiClient.get<VehicleOrderResponse>(VEHICLE_EVENT_URL, {
    params: { limit: 50 },
    timeout: 8_000,
  })
  if (!Array.isArray(data.items)) throw new Error('获取车辆子系统进出记录失败')

  const latestByGate = new Map<string, VehicleEvent>()
  data.items.forEach((event) => {
    const gateNo = String(event.gate_no)
    const doorId = VEHICLE_GATE_SCENE_DOOR_IDS[gateNo]
    if (!doorId || !validDoorIds.has(doorId)) return
    const current = latestByGate.get(gateNo)
    if (!current || event.captured_at > current.captured_at) latestByGate.set(gateNo, event)
  })

  return [...latestByGate.entries()].map(([gateNo, event]) => ({
    sourceDoorId: `vehicle:${gateNo}`,
    doorId: VEHICLE_GATE_SCENE_DOOR_IDS[gateNo]!,
    open: true,
    direction: event.direction,
    occurredAt: normalizeOccurredAt(event.captured_at),
    version: `${event.source_key}|${event.direction}|${event.captured_at}`,
    transient: true,
  }))
}

export const getCockpitDoorSignals = async (
  validDoorIds: ReadonlySet<string>,
): Promise<CockpitDoorSignal[]> => {
  const collectors = [getVehicleSignals(validDoorIds)]
  if (Object.keys(PERSONNEL_DEVICE_SCENE_DOOR_IDS).length > 0) {
    collectors.push(getPersonnelSignals(validDoorIds))
  }

  const results = await Promise.allSettled(collectors)
  const signals = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  if (results.every((result) => result.status === 'rejected')) {
    const firstError = results.find((result) => result.status === 'rejected')
    throw firstError?.reason ?? new Error('获取闸机信号失败')
  }
  return signals
}
