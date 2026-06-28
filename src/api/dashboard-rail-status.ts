import type { RailStatus } from '@/types/dashboard'

const RAIL_STATUS_MAP: Record<string, RailStatus> = {
  空闲: '空闲',
  占用: '占用',
  idle: '空闲',
  free: '空闲',
  empty: '空闲',
  occupied: '占用',
  busy: '占用',
  passing: '占用',
  inuse: '占用',
  'in-use': '占用',
}

/** 将后端可能返回的英文/别名统一为中文展示值 */
export function normalizeRailStatus(raw: unknown): RailStatus {
  if (raw == null) return '空闲'
  const key = String(raw).trim()
  if (key in RAIL_STATUS_MAP) return RAIL_STATUS_MAP[key]!
  const lower = key.toLowerCase()
  if (lower in RAIL_STATUS_MAP) return RAIL_STATUS_MAP[lower]!
  return key === '占用' ? '占用' : '空闲'
}
