import type { ApiResponse } from '@/types/dashboard'

/** 人员进出 — 区域进出统计粒度 */
export type PersonnelAccessGranularity = 'day' | 'month' | 'year'

/** 厂区固定 7 个区域（顺序与图表类目轴一致） */
export const PERSONNEL_ACCESS_REGIONS = [
  { id: 'A', name: 'A区' },
  { id: 'F', name: 'F区' },
  { id: 'E', name: 'E区' },
  { id: 'D', name: 'D区' },
  { id: 'H', name: 'H区' },
  { id: 'K', name: 'K区' },
  { id: 'J', name: 'J区' },
] as const

export type PersonnelAccessRegionId = (typeof PERSONNEL_ACCESS_REGIONS)[number]['id']

/** 单区域进出汇总 */
export interface PersonnelRegionStatItem {
  regionId: PersonnelAccessRegionId
  regionName: string
  /** 进入人次 */
  enterCount: number
  /** 离开人次 */
  exitCount: number
}

/** 粒度切换选项（前端 Tab / 按钮组可直接渲染） */
export interface PersonnelGranularityOption {
  value: PersonnelAccessGranularity
  label: string
}

/** GET /api/personnel-access/region-stats 的 data 载荷 */
export interface PersonnelRegionStatsData {
  granularity: PersonnelAccessGranularity
  /**
   * 与请求 anchor 一致：
   * - day: YYYY-MM-DD
   * - month: YYYY-MM
   * - year: YYYY
   */
  anchor: string
  /** 展示用周期文案，如「2026年5月29日」 */
  periodLabel: string
  /** 统计区间起（含），ISO 日期 YYYY-MM-DD */
  periodStart: string
  /** 统计区间止（含），ISO 日期 YYYY-MM-DD */
  periodEnd: string
  granularityOptions: PersonnelGranularityOption[]
  items: PersonnelRegionStatItem[]
  summary: {
    enterTotal: number
    exitTotal: number
    /** enterTotal - exitTotal */
    netIn: number
  }
}

export type PersonnelRegionStatsApiResponse = ApiResponse<PersonnelRegionStatsData>

/** 查询参数 */
export interface PersonnelRegionStatsQuery {
  granularity: PersonnelAccessGranularity
  anchor: string
}
