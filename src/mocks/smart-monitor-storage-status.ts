import { pseudo, seedFromString } from '@/mocks/access-stats-shared'
import {
  STORAGE_MONITOR_NODES,
  type StorageStatusData,
  type StorageStatusLevel,
} from '@/types/smart-monitor'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 各节点 Mock 总容量（TB） */
const NODE_TOTAL_TB = [48, 48, 96, 120] as const

/** 各节点 Mock 基准使用率 */
const NODE_BASE_USAGE = [15, 20, 25, 30] as const

const resolveStatus = (usagePercent: number): StorageStatusLevel => {
  if (usagePercent >= 90) return 'critical'
  if (usagePercent >= 75) return 'warning'
  return 'normal'
}

const buildSnapshotLabel = (date: Date) => {
  const y = date.getFullYear()
  const mo = date.getMonth() + 1
  const d = date.getDate()
  const h = pad2(date.getHours())
  const mi = pad2(date.getMinutes())
  return `${y}年${mo}月${d}日 ${h}:${mi}`
}

export function buildStorageStatusMock(): StorageStatusData {
  const now = new Date()
  const seed = seedFromString(`storage-status:${now.toISOString().slice(0, 13)}`)

  const items = STORAGE_MONITOR_NODES.map((node, idx) => {
    const wobble = (pseudo(seed, idx + 1) - 0.5) * 8
    const usagePercent = Math.round(Math.min(99, Math.max(5, NODE_BASE_USAGE[idx]! + wobble)) * 10) / 10
    const totalCapacityTb = NODE_TOTAL_TB[idx]!
    const usedCapacityTb = Math.round((totalCapacityTb * usagePercent) / 100 * 10) / 10
    return {
      storageId: node.id,
      storageName: node.name,
      totalCapacityTb,
      usedCapacityTb,
      usagePercent,
      status: resolveStatus(usagePercent),
    }
  })

  const totalCapacityTb = items.reduce((s, it) => s + it.totalCapacityTb, 0)
  const usedCapacityTb = Math.round(items.reduce((s, it) => s + it.usedCapacityTb, 0) * 10) / 10
  const avgUsagePercent =
    Math.round((items.reduce((s, it) => s + it.usagePercent, 0) / items.length) * 10) / 10
  const alertCount = items.filter((it) => it.status !== 'normal').length

  return {
    snapshotAt: now.toISOString(),
    snapshotLabel: buildSnapshotLabel(now),
    items,
    summary: {
      totalCapacityTb,
      usedCapacityTb,
      avgUsagePercent,
      alertCount,
    },
  }
}
