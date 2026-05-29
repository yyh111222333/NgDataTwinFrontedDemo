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
