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

  it('keeps the original panel layout without remounting charts on every event', () => {
    const component = source('src/components/cockpit/CockpitPersonnelOverview.vue')

    expect(component).not.toContain('new EventSource')
    expect(component).not.toContain(':key=')
    expect(component).not.toContain('personnel-overview__summary')
    expect(component).not.toContain('今日通行')
  })

  it('restores the original tab labels and chart presentation', () => {
    const config = source('src/config/cockpit.ts')
    const regionChart = source('src/components/cockpit/PersonnelRegionStatsChart.vue')
    const matterChart = source('src/components/cockpit/PersonnelMatterStatsChart.vue')
    const timeChart = source('src/components/cockpit/PersonnelTimeStatsChart.vue')

    expect(config).toContain("label: '区域进出统计'")
    expect(config).toContain("label: '事项分布'")
    expect(config).not.toContain("label: '设备进出统计'")
    expect(regionChart).toContain('<em>净入</em>')
    expect(regionChart).toContain('10_000')
    expect(matterChart).toContain('summary-label="总事项"')
    expect(matterChart).toContain(':refresh-interval-ms="10000"')
    expect(timeChart).toContain(':refresh-interval-ms="10000"')
    expect(timeChart).not.toContain('show-total')
  })
})
