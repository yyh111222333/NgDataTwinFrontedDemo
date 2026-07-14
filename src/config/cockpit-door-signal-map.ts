/**
 * 8084 驾驶舱接口仍使用旧版 SVG 元素 ID，这里统一映射到当前地图门级 ID。
 * 后续设备若直接返回当前 sceneDoorId，则无需在此增加配置。
 */
export const COCKPIT_DOOR_SIGNAL_ID_MAP: Readonly<Record<string, string>> = {
  // 全高闸：旧图按元素复制后缀编号，当前图按现场点位编号。
  gate_fullheight_A_01: 'fullheight_X04',
  'gate_fullheight_A_01-2': 'fullheight_X01',
  'gate_fullheight_A_01-3': 'fullheight_X03',
  'gate_fullheight_A_01-5': 'fullheight_X02',
  'gate_fullheight_A_01-6': 'fullheight_X02',

  // 汽车道闸与火车道闸。
  gate_barrier_A_02: 'vehicleBarrier_9',
  'gate_barrier_A_02-2': 'vehicleBarrier_07',
  'gate_barrier_A_02-3': 'vehicleBarrier_8',
  'gate_barrier_A_02-4': 'trainBarrier_02',
  'gate_barrier_A_02-5': 'trainBarrier_01',
  'gate_barrier_A_02-6': 'vehicleBarrier_10',
  'gate_barrier_A_02-9': 'vehicleBarrier_11',
  'gate_barrier_A_02-10': 'vehicleBarrier_12',
}
