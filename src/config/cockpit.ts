// 这个文件集中放静态配置：页面入口只负责 import，不把大段配置写在视图里，后续接后端时，可逐步把这些静态值替换成接口数据
export type BottomMenu = {
  id: 'personnel' | 'vehicle' | 'crane' | 'monitor'
  label: string
  url: string
}

export type KpiItem = {
  value: string | number
  label: string
}

export type PanelConfig = {
  // side 控制该面板显示在左列还是右列
  id: string
  title: string
  side: 'left' | 'right'
  dim?: boolean
  /** 组件内自带标题时设为 true */
  hideTitle?: boolean
  /** 侧栏内纵向占比，默认 1 */
  flex?: number
  /** 看板外观变体 */
  variant?: 'default' | 'overview'
  /** 内容区紧凑，不纵向撑满（如进场快捷预约） */
  compact?: boolean
}

const currentHostUrl = (port: number, path: string) => {
  if (typeof window === 'undefined') {
    return path
  }

  return `${window.location.protocol}//${window.location.hostname}:${port}${path}`
}

// 底部 4 个子系统入口
export const bottomMenus: BottomMenu[] = [
  { id: 'personnel', label: '人员管控子系统', url: '/gateway/personnel/' },
  { id: 'vehicle', label: '车辆管控子系统', url: '/parking' },
  { id: 'crane', label: '行车管控子系统', url: '/gateway/crane/' },
  { id: 'monitor', label: '智慧监控子系统', url: currentHostUrl(9001, '/dashboard') },
]

export type PanelTabItem = {
  key: string
  label: string
}

// 人员进出概况子 Tab
export const personnelOverviewTabs: PanelTabItem[] = [
  { key: 'region', label: '区域进出统计' },
  { key: 'matter', label: '事项分布' },
  { key: 'time', label: '进出时间分布' },
]

// 车辆进出概况子 Tab
export const vehicleOverviewTabs: PanelTabItem[] = [
  { key: 'channel', label: '通道进出统计' },
  { key: 'matter', label: '车辆类型分布' },
  { key: 'time', label: '进出时间分布' },
]

// 行车监测概况子 Tab
export const drivingMonitorTabs: PanelTabItem[] = [
  { key: 'parking', label: '停车评分统计' },
  { key: 'fatigue', label: '疲劳次数统计' },
  { key: 'occlusion', label: '遮挡监测' },
]

// 智慧监控概况子 Tab
export const smartMonitorTabs: PanelTabItem[] = [
  { key: 'danger', label: '危险事件统计' },
  { key: 'device', label: '设备在位统计' },
  { key: 'storage', label: '存储状况监控' },
]

// 中间 KPI 卡片（初始值），目前是为了稳定留的
export const middleStats: KpiItem[] = [
  { value: '24', label: '在线门禁' },
  { value: '134', label: '区域总人数' },
  { value: '24', label: '车辆在场' },
  { value: '空闲', label: '火车道状态' },
]

// 左右 6 个看板配置（顺序=页面从上到下顺序）
export const panels: PanelConfig[] = [
  { id: 'left-overview', title: '系统运行总览', side: 'left', flex: 1.15, variant: 'overview' },
  { id: 'left-device', title: '人员进出概况', side: 'left' },
  { id: 'left-stat', title: '车辆进出概况', side: 'left' },
  { id: 'right-board', title: '进场快捷预约', side: 'right', flex: 0.92, compact: true },
  { id: 'right-list', title: '行车监测概况', side: 'right', flex: 1.08 },
  { id: 'right-risk', title: '智慧监控概况', side: 'right', flex: 1.08 },
]
