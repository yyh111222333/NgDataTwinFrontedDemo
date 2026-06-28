import {
  DASHBOARD_DEVICE_REGIONS,
  getDeviceTypesForRegion,
} from '@/config/device-status-catalog'
import type { DeviceStatusOption, DeviceStatusOptionsData } from '@/types/dashboard'

const toOptions = (names: string[]): DeviceStatusOption[] =>
  names.map((name) => ({ id: name, name }))

/** GET /api/device-status/options Mock（regions 始终返回完整列表，deviceTypes 随 regionId 联动） */
export function buildDeviceStatusOptionsMock(regionId: string): DeviceStatusOptionsData {
  return {
    regions: toOptions([...DASHBOARD_DEVICE_REGIONS]),
    deviceTypes: toOptions(getDeviceTypesForRegion(regionId)),
  }
}
