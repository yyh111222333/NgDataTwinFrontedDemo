import { apiClient } from '@/api/client'
import {
  PERSONNEL_DEVICE_SCENE_DOOR_IDS,
  VEHICLE_GATE_SCENE_DOOR_IDS,
} from '@/config/cockpit-door-signal-map'
import type { CockpitDoorSignal } from '@/types/cockpit-door-signal'
import type { DoorFlowDirection } from '@/types/door'

const PERSONNEL_EVENT_URL = '/gateway/personnel/ControllerMonitor/GetNowInfo'
const VEHICLE_ORDER_URL = '/gateway/vehicle/InParkRecord/GetParkOrderList'

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

type VehicleOrder = {
  ParkOrder_ID?: number | string | null
  ParkOrder_No?: string | null
  ParkOrder_EnterTime?: string | null
  ParkOrder_EnterPasswayName?: string | null
  ParkOrder_OutTime?: string | null
  ParkOrder_OutPasswayName?: string | null
}

type VehicleOrderResponse = {
  code?: number
  msg?: string
  data?: VehicleOrder[]
}

type VehicleEvent = {
  gateNo: string
  doorId: string
  direction: DoorFlowDirection
  occurredAt: string
  recordId: string
}

const PERSONNEL_PASSAGE_REMARK = /智能识别|刷卡开门|按钮开门|远程开门|超级密码开门/
const VEHICLE_PASSWAY_PATTERN = /^(7|8|9|10|11)号门(进|出)车道$/

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

const toVehicleEvent = (
  order: VehicleOrder,
  passwayName: string | null | undefined,
  occurredAt: string | null | undefined,
): VehicleEvent | null => {
  if (!passwayName || !occurredAt || passwayName.startsWith('*')) return null

  const match = passwayName.trim().match(VEHICLE_PASSWAY_PATTERN)
  if (!match) return null

  const gateNo = match[1]
  const passwayDirection = match[2]
  if (!gateNo || !passwayDirection) return null

  const doorId = VEHICLE_GATE_SCENE_DOOR_IDS[gateNo]
  if (!doorId) return null

  return {
    gateNo,
    doorId,
    direction: passwayDirection === '进' ? 'in' : 'out',
    occurredAt,
    recordId: String(order.ParkOrder_ID ?? order.ParkOrder_No ?? occurredAt),
  }
}

const getVehicleSignals = async (
  validDoorIds: ReadonlySet<string>,
): Promise<CockpitDoorSignal[]> => {
  const body = new URLSearchParams({
    pageIndex: '1',
    pageSize: '20',
    conditionParam: '{}',
  })
  const { data } = await apiClient.post<VehicleOrderResponse>(VEHICLE_ORDER_URL, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 8_000,
  })
  if (!Array.isArray(data.data)) {
    throw new Error(data.msg || '获取车辆子系统进出记录失败')
  }

  const latestByGate = new Map<string, VehicleEvent>()
  data.data.forEach((order) => {
    const events = [
      toVehicleEvent(order, order.ParkOrder_EnterPasswayName, order.ParkOrder_EnterTime),
      toVehicleEvent(order, order.ParkOrder_OutPasswayName, order.ParkOrder_OutTime),
    ]
    events.forEach((event) => {
      if (!event || !validDoorIds.has(event.doorId)) return
      const current = latestByGate.get(event.gateNo)
      if (!current || event.occurredAt > current.occurredAt) {
        latestByGate.set(event.gateNo, event)
      }
    })
  })

  return [...latestByGate.values()].map((event) => ({
    sourceDoorId: `vehicle:${event.gateNo}`,
    doorId: event.doorId,
    open: true,
    direction: event.direction,
    occurredAt: normalizeOccurredAt(event.occurredAt),
    version: `${event.recordId}|${event.direction}|${event.occurredAt}`,
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
