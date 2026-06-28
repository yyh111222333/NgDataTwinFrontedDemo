/** 进出统计 Mock 共用：周期锚点、伪随机、粒度缩放 */

export type AccessStatsGranularity = 'day' | 'month' | 'year'

export const ACCESS_GRANULARITY_OPTIONS = [
  { value: 'day' as const, label: '按日统计' },
  { value: 'month' as const, label: '按月统计' },
  { value: 'year' as const, label: '按年统计' },
]

export const seedFromString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export const pseudo = (seed: number, salt: number) => ((seed * 9301 + salt * 49297) % 233280) / 233280

const parseAnchor = (granularity: AccessStatsGranularity, anchor: string) => {
  if (granularity === 'day') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor)
    if (!m) throw new Error('anchor 格式应为 YYYY-MM-DD')
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) }
  }
  if (granularity === 'month') {
    const m = /^(\d{4})-(\d{2})$/.exec(anchor)
    if (!m) throw new Error('anchor 格式应为 YYYY-MM')
    return { y: Number(m[1]), mo: Number(m[2]), d: 1 }
  }
  const m = /^(\d{4})$/.exec(anchor)
  if (!m) throw new Error('anchor 格式应为 YYYY')
  return { y: Number(m[1]), mo: 1, d: 1 }
}

const pad2 = (n: number) => String(n).padStart(2, '0')

const daysInMonth = (y: number, mo: number) => new Date(y, mo, 0).getDate()

export const buildAccessPeriod = (granularity: AccessStatsGranularity, anchor: string) => {
  const { y, mo, d } = parseAnchor(granularity, anchor)
  if (granularity === 'day') {
    const iso = `${y}-${pad2(mo)}-${pad2(d)}`
    return {
      periodLabel: `${y}年${mo}月${d}日`,
      periodStart: iso,
      periodEnd: iso,
    }
  }
  if (granularity === 'month') {
    const last = daysInMonth(y, mo)
    return {
      periodLabel: `${y}年${mo}月`,
      periodStart: `${y}-${pad2(mo)}-01`,
      periodEnd: `${y}-${pad2(mo)}-${pad2(last)}`,
    }
  }
  return {
    periodLabel: `${y}年`,
    periodStart: `${y}-01-01`,
    periodEnd: `${y}-12-31`,
  }
}

export const scaleByGranularity = (granularity: AccessStatsGranularity) => {
  if (granularity === 'day') return 1
  if (granularity === 'month') return 28
  return 365
}

export const defaultAccessStatsAnchors = () => {
  const now = new Date()
  const y = now.getFullYear()
  const mo = pad2(now.getMonth() + 1)
  const d = pad2(now.getDate())
  return {
    day: `${y}-${mo}-${d}`,
    month: `${y}-${mo}`,
    year: String(y),
  }
}

/** 每次请求时解析 anchor，避免组件挂载时刻不同导致跨 Tab 不一致 */
export const resolveAccessStatsAnchor = (granularity: AccessStatsGranularity) =>
  defaultAccessStatsAnchors()[granularity]

/** 进出时间分布：12 个两小时时段 */
export const ACCESS_TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const start = i * 2
  const end = start + 2
  return {
    id: `h${pad2(start)}`,
    label: `${pad2(start)}-${end === 24 ? '24' : pad2(end)}`,
  }
}) as ReadonlyArray<{ id: string; label: string }>

export const buildGranularityEnvelope = (
  granularity: AccessStatsGranularity,
  anchor: string,
) => ({
  granularity,
  anchor,
  ...buildAccessPeriod(granularity, anchor),
  granularityOptions: [...ACCESS_GRANULARITY_OPTIONS],
})

/** 按权重将 total 精确拆成整数数组（各项之和 === total） */
export const distributeTotalByWeights = (total: number, weights: readonly number[]) => {
  if (total <= 0) return weights.map(() => 0)

  const safeWeights = weights.map((w) => Math.max(0, w))
  const weightSum = safeWeights.reduce((s, w) => s + w, 0) || 1

  const counts = safeWeights.map((w) => Math.floor((w / weightSum) * total))
  let remainder = total - counts.reduce((s, n) => s + n, 0)

  const ranked = safeWeights
    .map((w, i) => ({
      i,
      frac: (w / weightSum) * total - counts[i]!,
    }))
    .sort((a, b) => b.frac - a.frac)

  for (let k = 0; k < remainder; k += 1) {
    counts[ranked[k % ranked.length]!.i]! += 1
  }

  return counts
}

/** 按固定占比拆分（ratioPercents 之和应为 100，无随机扰动，饼图切换粒度时形状变化明显） */
export const buildMatterItemsFromRatios = (
  matters: ReadonlyArray<{ id: string; name: string }>,
  ratioPercents: readonly number[],
  total: number,
) => {
  const counts = distributeTotalByWeights(total, ratioPercents)
  const totalCount = counts.reduce((s, n) => s + n, 0)

  return {
    items: matters.map((matter, idx) => {
      const count = counts[idx]!
      return {
        matterId: matter.id,
        matterName: matter.name,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0,
      }
    }),
    summary: { totalCount },
  }
}

/** 将进出总量按时段权重拆分（各时段 enter/exit 之和分别等于传入总量） */
export const buildTimeSlotItemsFromTotals = (
  enterTotal: number,
  exitTotal: number,
  seed: number,
) => {
  const peakIndices = new Set([4, 5, 6, 7, 8])

  const enterWeights = ACCESS_TIME_SLOTS.map((_, idx) => {
    const peakBoost = peakIndices.has(idx) ? 1.8 : 0.85
    return Math.max(0.01, (8 + pseudo(seed, idx + 3) * 22) * peakBoost)
  })

  const exitWeights = ACCESS_TIME_SLOTS.map((_, idx) => {
    const peakBoost = peakIndices.has(idx) ? 1.8 : 0.85
    return Math.max(0.01, (8 + pseudo(seed, idx + 19) * 22) * peakBoost)
  })

  const enterCounts = distributeTotalByWeights(enterTotal, enterWeights)
  const exitCounts = distributeTotalByWeights(exitTotal, exitWeights)

  const items = ACCESS_TIME_SLOTS.map((slot, idx) => ({
    slotId: slot.id,
    slotLabel: slot.label,
    enterCount: enterCounts[idx]!,
    exitCount: exitCounts[idx]!,
  }))

  const peak = items.reduce(
    (best, it) => {
      const slotTotal = it.enterCount + it.exitCount
      return slotTotal > best.total ? { slotLabel: it.slotLabel, total: slotTotal } : best
    },
    { slotLabel: items[0]?.slotLabel ?? '—', total: 0 },
  )

  return {
    items,
    summary: {
      enterTotal,
      exitTotal,
      peakSlotLabel: peak.slotLabel,
      peakTotal: peak.total,
    },
  }
}
