/** 停车平台车道名称中的门号到当前场景道闸 ID。 */
export const VEHICLE_GATE_SCENE_DOOR_IDS: Readonly<Record<string, string>> = {
  '7': 'vehicleBarrier_07',
  '8': 'vehicleBarrier_8',
  '9': 'vehicleBarrier_9',
  '10': 'vehicleBarrier_10',
  '11': 'vehicleBarrier_11',
}

/**
 * 人员平台设备序列号到全高闸场景 ID。
 * 现场平台没有维护 X01-X04 点位名称，确认物理对应关系后在此补齐。
 */
export const PERSONNEL_DEVICE_SCENE_DOOR_IDS: Readonly<Record<string, string>> = {}

/** 人员平台当前在线设备，保留 IP 便于现场确认全高闸点位。 */
export const PERSONNEL_DEVICES = [
  { deviceNo: '2603093201352', ip: '192.168.51.100' },
  { deviceNo: '26030931529A1', ip: '192.168.52.100' },
  { deviceNo: '260309316281B', ip: '192.168.52.105' },
  { deviceNo: '2603093144285', ip: '192.168.52.106' },
  { deviceNo: '26030931798E7', ip: '192.168.53.100' },
  { deviceNo: '26030512276CE', ip: '192.168.53.113' },
  { deviceNo: '2603051212818', ip: '192.168.53.118' },
] as const
