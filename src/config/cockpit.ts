// 这个文件集中放静态配置：页面入口只负责 import，不把大段配置写在视图里，后续接后端时，可逐步把这些静态值替换成接口数据
export type BottomMenu = {
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
}

// 底部 4 个子系统入口
export const bottomMenus: BottomMenu[] = [
  { label: '人脸识别', url: 'http://localhost:5173/' },
  { label: '车辆管控', url: 'http://localhost:5173/' },
  { label: '行车管控', url: 'http://localhost:5173/' },
  { label: '火灾算法', url: 'http://localhost:5173/' },
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
  { id: 'left-overview', title: '运行总览', side: 'left' },
  { id: 'left-device', title: '设备状态', side: 'left' },
  { id: 'left-stat', title: '统计', side: 'left' },
  { id: 'right-board', title: '事件看板', side: 'right' },
  { id: 'right-list', title: '事件列表', side: 'right'  },
  { id: 'right-risk', title: '风险预警', side: 'right' },
]

