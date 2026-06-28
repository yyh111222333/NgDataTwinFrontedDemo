import {
  DASHBOARD_DEVICE_REGIONS,
  INDOOR_DEVICE_REGIONS,
  type DashboardDeviceType,
} from '@/config/device-status-catalog'
import type { DashboardDeviceRecord } from '@/types/dashboard'

/** 已确认真实台账的 5 类设备（全厂合计固定） */
export const MOCK_DEVICE_TYPE_TOTALS = {
  连锁管控门: 30,
  火车道管控门: 4,
  人脸门禁: 4,
  汽车道闸: 6,
  火车道闸: 2,
} as const satisfies Partial<Record<DashboardDeviceType, number>>

type VerifiedDeviceType = keyof typeof MOCK_DEVICE_TYPE_TOTALS

type SensorDeviceType = '摄像机' | '声光报警' | '光电报警' | '烟感器' | '温感器'

/** 连锁管控门 / 人脸门禁：按厂区真实分布 */
const VERIFIED_INDOOR_ALLOCATION: Partial<
  Record<VerifiedDeviceType, Partial<Record<string, number>>>
> = {
  连锁管控门: {
    A区: 1,
    F区: 3,
    E区: 7,
    D区: 6,
    H区: 2,
    K区: 7,
    J区: 4,
    L区: 0,
  },
  人脸门禁: {
    A区: 1,
    F区: 1,
    E区: 1,
    L区: 1,
  },
}

const VERIFIED_OUTDOOR_ALLOCATION: Partial<
  Record<VerifiedDeviceType, Partial<Record<string, number>>>
> = {
  火车道管控门: { 火车道: 4 },
  火车道闸: { 火车道: 2 },
  汽车道闸: { 道路: 6 },
}

const uniformIndoor = (count: number): Record<string, number> =>
  Object.fromEntries(INDOOR_DEVICE_REGIONS.map((region) => [region, count]))

/** 室内传感器 / 报警类：每区少量 Mock（待真实 API 替换） */
const INDOOR_SENSOR_ALLOCATION: Record<SensorDeviceType, Record<string, number>> = {
  摄像机: uniformIndoor(2),
  声光报警: uniformIndoor(1),
  光电报警: uniformIndoor(1),
  烟感器: uniformIndoor(2),
  温感器: uniformIndoor(1),
}

const seedFromTick = (tick: number, salt: string) => {
  let h = tick >>> 0
  for (let i = 0; i < salt.length; i += 1) h = (h * 31 + salt.charCodeAt(i)) >>> 0
  return h
}

const pseudo = (tick: number, salt: string) => (seedFromTick(tick, salt) % 1000) / 1000

const getVerifiedRegionTotal = (device: VerifiedDeviceType, region: string): number => {
  const indoor = VERIFIED_INDOOR_ALLOCATION[device]?.[region]
  if (indoor !== undefined) return indoor
  return VERIFIED_OUTDOOR_ALLOCATION[device]?.[region] ?? 0
}

const getSensorRegionTotal = (device: SensorDeviceType, region: string): number => {
  return INDOOR_SENSOR_ALLOCATION[device]?.[region] ?? 0
}

/** 总台数不变，按 tick 微调在线/离线划分 */
const splitOnlineOffline = (
  total: number,
  tick: number,
  salt: string,
): { online: number; abnormal: number; offline: number } => {
  if (total <= 0) return { online: 0, abnormal: 0, offline: 0 }

  let offline = 0
  if (total >= 6) {
    offline = pseudo(tick, salt) > 0.85 ? 1 : 0
  } else if (total >= 2) {
    offline = pseudo(tick, salt) > 0.92 ? 1 : 0
  } else {
    offline = tick > 0 && tick % 20 === 0 && pseudo(tick, salt) > 0.88 ? 1 : 0
  }

  return { online: total - offline, offline, abnormal: 0 }
}

const pushRecord = (
  records: DashboardDeviceRecord[],
  region: string,
  device: string,
  total: number,
  tick: number,
) => {
  if (total <= 0) return
  const { online, abnormal, offline } = splitOnlineOffline(total, tick, `${region}:${device}`)
  records.push({ region, device, online, abnormal, offline })
}

/** 按区域×设备生成 Mock 台账 */
export function buildDeviceStatusRecords(tick = 0): DashboardDeviceRecord[] {
  const records: DashboardDeviceRecord[] = []

  for (const region of DASHBOARD_DEVICE_REGIONS) {
    for (const device of Object.keys(MOCK_DEVICE_TYPE_TOTALS) as VerifiedDeviceType[]) {
      pushRecord(records, region, device, getVerifiedRegionTotal(device, region), tick)
    }

    if (!(INDOOR_DEVICE_REGIONS as readonly string[]).includes(region)) continue

    for (const device of Object.keys(INDOOR_SENSOR_ALLOCATION) as SensorDeviceType[]) {
      pushRecord(records, region, device, getSensorRegionTotal(device, region), tick)
    }
  }

  return records
}
