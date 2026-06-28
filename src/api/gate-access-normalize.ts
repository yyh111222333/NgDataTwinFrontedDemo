import type { DoorFlowDirection } from '@/types/door'

const DIRECTION_IN = new Set(['in', 'enter', 'entry', '进'])
const DIRECTION_OUT = new Set(['out', 'exit', 'leave', '出'])

/** 将后端方向字段规范为 in | out */
export const normalizeGateAccessDirection = (raw: string): DoorFlowDirection => {
  const key = raw.trim().toLowerCase()
  if (DIRECTION_IN.has(key)) return 'in'
  if (DIRECTION_OUT.has(key)) return 'out'
  throw new Error(`无法识别的门禁方向: ${raw}`)
}

/**
 * 将 doorId 规范为 SVG 场景门 ID。
 * 支持 person_A01、gate_person_A_01 等别名。
 */
export const normalizeSceneDoorId = (raw: string, validIds: ReadonlySet<string>): string | null => {
  const trimmed = raw.trim()
  if (validIds.has(trimmed)) return trimmed

  const gateMatch = /^gate_(person|tripod|fullheight|vehicleBarrier|trainBarrier)_([\w\d]+)_([\w\d]+)$/i.exec(
    trimmed,
  )
  if (gateMatch) {
    const [, type, area, index] = gateMatch
    if (!type || !area || !index) return null
    const padded = index.padStart(2, '0')
    const candidate = `${type}_${area}${padded}`
    if (validIds.has(candidate)) return candidate
    const compact = `${type}_${area}${index}`
    if (validIds.has(compact)) return compact
  }

  const looseMatch = /^(person|tripod|fullheight|vehicleBarrier|trainBarrier)_([\w\d]+)_([\w\d]+)$/i.exec(
    trimmed,
  )
  if (looseMatch) {
    const [, type, area, index] = looseMatch
    if (!type || !area || !index) return null
    const padded = index.padStart(2, '0')
    const candidate = `${type}_${area}${padded}`
    if (validIds.has(candidate)) return candidate
    const compact = `${type}_${area}${index}`
    if (validIds.has(compact)) return compact
  }

  return null
}
