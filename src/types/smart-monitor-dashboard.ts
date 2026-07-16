export interface SmartMonitorTrendPoint {
  x: number
  y: number
}

export interface SmartMonitorAlarmRankItem {
  code: string
  name: string
  count: number
}

export interface SmartMonitorAlarmItem {
  id: number
  code: string
  stream_nickname: string
  flow_name: string
  state: number
  create_time_str: string
}

export interface SmartMonitorDashboardData {
  last7DayChartData: SmartMonitorTrendPoint[]
  last7DayRankData: SmartMonitorAlarmRankItem[]
  todayAlarmTotalCount: number
  todayAlarmHandleCount: number
  todayAlarmUnHandleCount: number
  streamTotalCount: number
  streamOnlineCount: number
  alarmData: SmartMonitorAlarmItem[]
}

export interface SmartMonitorDashboardResponse {
  code: number
  msg: string
  info?: Partial<SmartMonitorDashboardData>
}
