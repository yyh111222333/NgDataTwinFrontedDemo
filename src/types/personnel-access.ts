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

/** 人员进厂事项（饼图固定 5 类） */
export const PERSONNEL_MATTER_TYPES = [
  { id: 'work', name: '进厂作业', color: '#5ce8ff' },
  { id: 'visit', name: '参观访问', color: '#4ade80' },
  { id: 'maintain', name: '设备维护', color: '#e8c84a' },
  { id: 'logistics', name: '物资运送', color: '#f59e0b' },
  { id: 'other', name: '其他', color: '#a78bfa' },
] as const

export type PersonnelMatterId = (typeof PERSONNEL_MATTER_TYPES)[number]['id']

export interface PersonnelMatterStatItem {
  matterId: PersonnelMatterId
  matterName: string
  count: number
  percentage: number
}

export interface PersonnelMatterStatsData {
  granularity: PersonnelAccessGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: PersonnelGranularityOption[]
  items: PersonnelMatterStatItem[]
  summary: { totalCount: number }
}

export type PersonnelMatterStatsApiResponse = ApiResponse<PersonnelMatterStatsData>
export type PersonnelMatterStatsQuery = PersonnelRegionStatsQuery

export interface PersonnelTimeStatItem {
  slotId: string
  slotLabel: string
  enterCount: number
  exitCount: number
}

export interface PersonnelTimeStatsData {
  granularity: PersonnelAccessGranularity
  anchor: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  granularityOptions: PersonnelGranularityOption[]
  items: PersonnelTimeStatItem[]
  summary: {
    enterTotal: number
    exitTotal: number
    peakSlotLabel: string
    peakTotal: number
  }
}

export type PersonnelTimeStatsApiResponse = ApiResponse<PersonnelTimeStatsData>
export type PersonnelTimeStatsQuery = PersonnelRegionStatsQuery
