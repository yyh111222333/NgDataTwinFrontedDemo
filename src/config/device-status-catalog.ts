/**
 * 设备在位统计：区域 / 设备类型目录与区域→设备映射。
 * 区域取自厂区 SVG（字母区 + 火车道、道路），不含「产品管理室」等子区域后缀。
 */

/** 室内字母区（与厂区地图、人员进出统计一致，含 SVG 中的 L区） */
export const INDOOR_DEVICE_REGIONS = [
  'A区',
  'F区',
  'E区',
  'D区',
  'H区',
  'K区',
  'J区',
  'L区',
] as const

/** 室外 / 专用通道 */
export const OUTDOOR_DEVICE_REGIONS = ['火车道', '道路'] as const

export const DASHBOARD_DEVICE_REGIONS = [
  ...INDOOR_DEVICE_REGIONS,
  ...OUTDOOR_DEVICE_REGIONS,
] as const

export type DashboardDeviceRegion = (typeof DASHBOARD_DEVICE_REGIONS)[number]

/** 设备类型（筛选项「全部」由 UI 追加，不在此列表） */
export const DASHBOARD_DEVICE_TYPES = [
  '连锁管控门',
  '火车道管控门',
  '人脸门禁',
  '汽车道闸',
  '火车道闸',
  '摄像机',
  '声光报警',
  '光电报警',
  '烟感器',
  '温感器',
] as const

export type DashboardDeviceType = (typeof DASHBOARD_DEVICE_TYPES)[number]

/** 室内区域可用设备（不含道闸类） */
export const INDOOR_DEVICE_TYPES: DashboardDeviceType[] = [
  '连锁管控门',
  '人脸门禁',
  '摄像机',
  '声光报警',
  '光电报警',
  '烟感器',
  '温感器',
]

const isIndoorRegion = (region: string) =>
  (INDOOR_DEVICE_REGIONS as readonly string[]).includes(region)

/** 按区域返回可选设备类型（regionId 为 all 时返回全部类型） */
export function getDeviceTypesForRegion(regionId: string): DashboardDeviceType[] {
  if (regionId === 'all') {
    return [...DASHBOARD_DEVICE_TYPES]
  }
  if (regionId === '道路') {
    return ['汽车道闸']
  }
  if (regionId === '火车道') {
    return ['火车道管控门', '火车道闸']
  }
  if (isIndoorRegion(regionId)) {
    return [...INDOOR_DEVICE_TYPES]
  }
  return [...DASHBOARD_DEVICE_TYPES]
}

/** 生成有效的区域×设备组合（用于 Mock / 初始数据） */
export function buildValidRegionDevicePairs(): Array<{ region: string; device: string }> {
  return DASHBOARD_DEVICE_REGIONS.flatMap((region) =>
    getDeviceTypesForRegion(region).map((device) => ({ region, device })),
  )
}
