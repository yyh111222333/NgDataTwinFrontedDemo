import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { describe, expect, it } from 'vitest'

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), 'utf-8')

describe('personnel cockpit live data wiring', () => {
  it('contains no forced personnel mock mode', () => {
    const files = [
      'src/components/cockpit/PersonnelRegionStatsChart.vue',
      'src/components/cockpit/PersonnelMatterStatsChart.vue',
      'src/components/cockpit/PersonnelTimeStatsChart.vue',
    ]
    const combined = files.map(source).join('\n')

    expect(combined).not.toContain('useMock: true')
    expect(combined).toContain('getPersonnelDeviceStats')
    expect(combined).toContain('getPersonnelDepartmentStats')
  })

  it('shows K30 summary and listens for realtime personnel events', () => {
    const component = source('src/components/cockpit/CockpitPersonnelOverview.vue')

    expect(component).toContain('getPersonnelSummary')
    expect(component).toContain('new EventSource')
    expect(component).toContain('personnel.event')
    expect(component).toContain('今日通行')
    expect(component).toContain('数据暂不可用')
    expect(component).toContain("eventSource.addEventListener('open'")
    expect(component).toContain("eventSource.addEventListener('error'")
  })

  it('uses truthful device and department tab labels', () => {
    const config = source('src/config/cockpit.ts')

    expect(config).toContain("label: '设备进出统计'")
    expect(config).toContain("label: '部门通行分布'")
    expect(config).not.toContain("label: '事项分布'")
  })
})
