import { apiClient } from '@/api/client'
import { resolveUseMock } from '@/api/resolve-use-mock'
import {
  ACCESS_TIME_SLOTS,
  buildAccessPeriod,
  buildGranularityEnvelope,
} from '@/mocks/access-stats-shared'
import { buildVehicleChannelStatsMock } from '@/mocks/vehicle-access-channel-stats'
import { buildVehicleMatterStatsMock } from '@/mocks/vehicle-access-matter-stats'
import { buildVehicleTimeStatsMock } from '@/mocks/vehicle-access-time-stats'
import type {
  VehicleAccessGranularity,
  VehicleChannelStatsData,
  VehicleChannelStatsQuery,
  VehicleMatterId,
  VehicleMatterStatsData,
  VehicleMatterStatsQuery,
  VehicleTimeStatItem,
  VehicleTimeStatsData,
  VehicleTimeStatsQuery,
} from '@/types/vehicle-access'
import { VEHICLE_ACCESS_CHANNELS, VEHICLE_MATTER_TYPES } from '@/types/vehicle-access'

const VEHICLE_ORDER_URL = '/gateway/vehicle-stats/InParkRecord/GetParkOrderList'
const VEHICLE_PARK_CODE = '2077023635452858368'
const VEHICLE_ORDER_PAGE_SIZE = 500
const VEHICLE_DATA_CACHE_MS = 20_000

type VehiclePlatformOrder = {
  ParkOrder_ID?: number | string | null
  ParkOrder_No?: string | null
  ParkOrder_CarTypeName?: string | null
  ParkOrder_EnterTime?: string | null
  ParkOrder_EnterPasswayName?: string | null
  ParkOrder_OutTime?: string | null
  ParkOrder_OutPasswayName?: string | null
  ParkOrder_IsUnlicensedCar?: number | string | null
}

type VehicleOrderListResponse = {
  count?: number
  data?: VehiclePlatformOrder[]
  msg?: string
}

type VehicleSummaryResponse = {
  success?: boolean
  msg?: string
  data?: { num1?: number | string; num2?: number | string }
}

export type VehiclePlatformSummary = {
  vehiclesOnSite: number
  remainingSpaces: number
  onlineDevices: number
  offlineDevices: number
}

type PeriodBounds = {
  start: string
  end: string
}

type CachedOrders = {
  expiresAt: number
  promise: Promise<VehiclePlatformOrder[]>
}

const ordersCache = new Map<string, CachedOrders>()

const toPeriodBounds = (granularity: VehicleAccessGranularity, anchor: string): PeriodBounds => {
  const period = buildAccessPeriod(granularity, anchor)
  return {
    start: `${period.periodStart} 00:00:00`,
    end: `${period.periodEnd} 23:59:59`,
  }
}

const fetchVehicleOrderPage = async (conditionParam: Record<string, string>, pageIndex: number) => {
  const body = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: String(VEHICLE_ORDER_PAGE_SIZE),
    conditionParam: JSON.stringify(conditionParam),
  })
  const { data } = await apiClient.post<VehicleOrderListResponse>(VEHICLE_ORDER_URL, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 12_000,
  })
  if (!Array.isArray(data.data)) {
    throw new Error(data.msg || '获取车辆平台出入场记录失败')
  }
  return { rows: data.data, count: Number(data.count ?? data.data.length) }
}

const fetchVehicleOrdersByCondition = async (conditionParam: Record<string, string>) => {
  const first = await fetchVehicleOrderPage(conditionParam, 1)
  const pageCount = Math.ceil(first.count / VEHICLE_ORDER_PAGE_SIZE)
  if (pageCount <= 1) return first.rows

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchVehicleOrderPage(conditionParam, index + 2),
    ),
  )
  return [first, ...remainingPages].flatMap((page) => page.rows)
}

const getVehicleOrders = async (
  granularity: VehicleAccessGranularity,
  anchor: string,
): Promise<VehiclePlatformOrder[]> => {
  const cacheKey = `${granularity}:${anchor}`
  const cached = ordersCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const { start, end } = toPeriodBounds(granularity, anchor)
  const promise = Promise.all([
    fetchVehicleOrdersByCondition({ ParkOrder_EnterTime0: start, ParkOrder_EnterTime1: end }),
    fetchVehicleOrdersByCondition({ ParkOrder_OutTime0: start, ParkOrder_OutTime1: end }),
  ]).then(([enterOrders, exitOrders]) => {
    const uniqueOrders = new Map<string, VehiclePlatformOrder>()
    ;[...enterOrders, ...exitOrders].forEach((order) => {
      const key = String(order.ParkOrder_ID ?? order.ParkOrder_No ?? JSON.stringify(order))
      uniqueOrders.set(key, order)
    })
    return [...uniqueOrders.values()]
  })

  ordersCache.set(cacheKey, { expiresAt: Date.now() + VEHICLE_DATA_CACHE_MS, promise })
  try {
    return await promise
  } catch (error) {
    ordersCache.delete(cacheKey)
    throw error
  }
}

const isWithinPeriod = (value: string | null | undefined, bounds: PeriodBounds) =>
  Boolean(value && value >= bounds.start && value <= bounds.end)

const getGateNo = (passwayName: string | null | undefined, direction: '进' | '出') => {
  if (!passwayName || passwayName.startsWith('*')) return null
  return passwayName.trim().match(new RegExp(`^(7|8|9|10|11)号门${direction}车道$`))?.[1] ?? null
}

const classifyVehicle = (order: VehiclePlatformOrder): VehicleMatterId => {
  const typeName = order.ParkOrder_CarTypeName?.trim() ?? ''
  if (Number(order.ParkOrder_IsUnlicensedCar) === 1 || /无牌|0牌/.test(typeName))
    return 'unlicensed'
  if (typeName.includes('黄')) return 'yellow'
  if (typeName.includes('蓝')) return 'blue'
  if (typeName.includes('绿')) return 'green'
  return 'other'
}

const buildTimeSlots = (
  granularity: VehicleAccessGranularity,
  anchor: string,
): VehicleTimeStatItem[] => {
  if (granularity === 'day') {
    return ACCESS_TIME_SLOTS.map((slot) => ({
      slotId: slot.id,
      slotLabel: slot.label,
      enterCount: 0,
      exitCount: 0,
    }))
  }

  if (granularity === 'month') {
    const { periodEnd } = buildAccessPeriod(granularity, anchor)
    const days = Number(periodEnd.slice(-2))
    return Array.from({ length: days }, (_, index) => ({
      slotId: `d${String(index + 1).padStart(2, '0')}`,
      slotLabel: `${index + 1}日`,
      enterCount: 0,
      exitCount: 0,
    }))
  }

  return Array.from({ length: 12 }, (_, index) => ({
    slotId: `m${String(index + 1).padStart(2, '0')}`,
    slotLabel: `${index + 1}月`,
    enterCount: 0,
    exitCount: 0,
  }))
}

const getTimeSlotIndex = (value: string, granularity: VehicleAccessGranularity) => {
  if (granularity === 'day') return Math.floor(Number(value.slice(11, 13)) / 2)
  if (granularity === 'month') return Number(value.slice(8, 10)) - 1
  return Number(value.slice(5, 7)) - 1
}

/** 读取车辆平台当前场内车辆及设备在线统计。 */
export async function getVehiclePlatformSummary(): Promise<VehiclePlatformSummary> {
  const params = { code: VEHICLE_PARK_CODE, _: Date.now() }
  const [orderResult, deviceResult] = await Promise.all([
    apiClient.get<VehicleSummaryResponse>('/gateway/vehicle/Index/OrderNumber', { params }),
    apiClient.get<VehicleSummaryResponse>('/gateway/vehicle/Index/DeviceNumber', { params }),
  ])

  if (!orderResult.data.success || !orderResult.data.data) {
    throw new Error(orderResult.data.msg || '获取车辆在场数据失败')
  }
  if (!deviceResult.data.success || !deviceResult.data.data) {
    throw new Error(deviceResult.data.msg || '获取车辆设备状态失败')
  }

  return {
    vehiclesOnSite: Number(orderResult.data.data.num1 ?? 0),
    remainingSpaces: Number(orderResult.data.data.num2 ?? 0),
    onlineDevices: Number(deviceResult.data.data.num1 ?? 0),
    offlineDevices: Number(deviceResult.data.data.num2 ?? 0),
  }
}

/** 车辆进出 - 通道进出统计。 */
export async function getVehicleChannelStats(
  query: VehicleChannelStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleChannelStatsData> {
  if (resolveUseMock(options)) {
    return buildVehicleChannelStatsMock(query.granularity, query.anchor)
  }

  const orders = await getVehicleOrders(query.granularity, query.anchor)
  const bounds = toPeriodBounds(query.granularity, query.anchor)
  const envelope = buildGranularityEnvelope(query.granularity, query.anchor)
  const counters = new Map<string, { enterCount: number; exitCount: number }>(
    VEHICLE_ACCESS_CHANNELS.map((channel) => [channel.id, { enterCount: 0, exitCount: 0 }]),
  )

  orders.forEach((order) => {
    if (isWithinPeriod(order.ParkOrder_EnterTime, bounds)) {
      const gateNo = getGateNo(order.ParkOrder_EnterPasswayName, '进')
      const counter = gateNo ? counters.get(gateNo) : null
      if (counter) counter.enterCount += 1
    }
    if (isWithinPeriod(order.ParkOrder_OutTime, bounds)) {
      const gateNo = getGateNo(order.ParkOrder_OutPasswayName, '出')
      const counter = gateNo ? counters.get(gateNo) : null
      if (counter) counter.exitCount += 1
    }
  })

  const items = VEHICLE_ACCESS_CHANNELS.map((channel) => ({
    channelId: channel.id,
    channelName: channel.name,
    ...counters.get(channel.id)!,
  }))
  const enterTotal = items.reduce((sum, item) => sum + item.enterCount, 0)
  const exitTotal = items.reduce((sum, item) => sum + item.exitCount, 0)

  return {
    ...envelope,
    items,
    summary: { enterTotal, exitTotal, netIn: enterTotal - exitTotal },
  }
}

/** 车辆平台真实车牌类型分布。 */
export async function getVehicleMatterStats(
  query: VehicleMatterStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleMatterStatsData> {
  if (resolveUseMock(options)) {
    return buildVehicleMatterStatsMock(query.granularity, query.anchor)
  }

  const orders = await getVehicleOrders(query.granularity, query.anchor)
  const bounds = toPeriodBounds(query.granularity, query.anchor)
  const relevantOrders = orders.filter(
    (order) =>
      (isWithinPeriod(order.ParkOrder_EnterTime, bounds) &&
        getGateNo(order.ParkOrder_EnterPasswayName, '进')) ||
      (isWithinPeriod(order.ParkOrder_OutTime, bounds) &&
        getGateNo(order.ParkOrder_OutPasswayName, '出')),
  )
  const counters = new Map<VehicleMatterId, number>(
    VEHICLE_MATTER_TYPES.map((matter) => [matter.id, 0]),
  )
  relevantOrders.forEach((order) => {
    const id = classifyVehicle(order)
    counters.set(id, (counters.get(id) ?? 0) + 1)
  })
  const totalCount = relevantOrders.length

  return {
    ...buildGranularityEnvelope(query.granularity, query.anchor),
    items: VEHICLE_MATTER_TYPES.map((matter) => {
      const count = counters.get(matter.id) ?? 0
      return {
        matterId: matter.id,
        matterName: matter.name,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 1_000) / 10 : 0,
      }
    }),
    summary: { totalCount },
  }
}

/** 车辆平台真实进出时间分布。 */
export async function getVehicleTimeStats(
  query: VehicleTimeStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleTimeStatsData> {
  if (resolveUseMock(options)) {
    return buildVehicleTimeStatsMock(query.granularity, query.anchor)
  }

  const orders = await getVehicleOrders(query.granularity, query.anchor)
  const bounds = toPeriodBounds(query.granularity, query.anchor)
  const items = buildTimeSlots(query.granularity, query.anchor)

  orders.forEach((order) => {
    if (
      isWithinPeriod(order.ParkOrder_EnterTime, bounds) &&
      getGateNo(order.ParkOrder_EnterPasswayName, '进')
    ) {
      const item = items[getTimeSlotIndex(order.ParkOrder_EnterTime!, query.granularity)]
      if (item) item.enterCount += 1
    }
    if (
      isWithinPeriod(order.ParkOrder_OutTime, bounds) &&
      getGateNo(order.ParkOrder_OutPasswayName, '出')
    ) {
      const item = items[getTimeSlotIndex(order.ParkOrder_OutTime!, query.granularity)]
      if (item) item.exitCount += 1
    }
  })

  const enterTotal = items.reduce((sum, item) => sum + item.enterCount, 0)
  const exitTotal = items.reduce((sum, item) => sum + item.exitCount, 0)
  const peak = items.reduce(
    (current, item) => {
      const total = item.enterCount + item.exitCount
      return total > current.total ? { label: item.slotLabel, total } : current
    },
    { label: items[0]?.slotLabel ?? '-', total: 0 },
  )

  return {
    ...buildGranularityEnvelope(query.granularity, query.anchor),
    items,
    summary: {
      enterTotal,
      exitTotal,
      peakSlotLabel: peak.label,
      peakTotal: peak.total,
    },
  }
}
