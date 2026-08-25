import { apiClient } from '@/api/client'
import {
  buildPersonnelDeviceDisplayData,
  getPersonnelDepartmentStats,
  getPersonnelDeviceStats,
  getPersonnelSummary,
  getPersonnelTimeStats,
} from '@/api/personnel-access'
import type { PersonnelDeviceStatItem, PersonnelDeviceStatsData } from '@/types/personnel-access'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = vi.mocked(apiClient.get)

const deviceStat = (
  deviceId: string,
  deviceName: string,
  enterCount: number,
  exitCount = 0,
  unknownCount = 0,
): PersonnelDeviceStatItem => ({
  deviceId,
  deviceName,
  enterCount,
  exitCount,
  unknownCount,
  totalCount: enterCount + exitCount + unknownCount,
})

const deviceStats = (items: PersonnelDeviceStatItem[]): PersonnelDeviceStatsData => {
  const summary = items.reduce(
    (total, item) => ({
      enterTotal: total.enterTotal + item.enterCount,
      exitTotal: total.exitTotal + item.exitCount,
      unknownTotal: total.unknownTotal + item.unknownCount,
      totalCount: total.totalCount + item.totalCount,
    }),
    { enterTotal: 0, exitTotal: 0, unknownTotal: 0, totalCount: 0 },
  )

  return {
    granularity: 'day',
    anchor: '2026-08-25',
    periodLabel: '2026年8月25日',
    periodStart: '2026-08-25',
    periodEnd: '2026-08-25',
    granularityOptions: [],
    coverageStartAt: '2026-08-25 17:50:44',
    partial: true,
    observedAt: '2026-08-25T20:00:00+08:00',
    source: 'K30',
    items,
    summary,
  }
}

describe('personnel live api', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedGet.mockResolvedValue({
      data: { success: true, message: '', data: { items: [], summary: {} } },
    })
  })

  it('requests the real personnel summary endpoint', async () => {
    await getPersonnelSummary()
    expect(mockedGet).toHaveBeenCalledWith('/api/personnel-access/summary')
  })

  it('uses the real device department and time endpoints with the selected period', async () => {
    const query = { granularity: 'day' as const, anchor: '2026-08-25' }

    await getPersonnelDeviceStats(query)
    await getPersonnelDepartmentStats(query)
    await getPersonnelTimeStats(query)

    expect(mockedGet).toHaveBeenNthCalledWith(1, '/api/personnel-access/device-stats', {
      params: query,
    })
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/personnel-access/department-stats', {
      params: query,
    })
    expect(mockedGet).toHaveBeenNthCalledWith(3, '/api/personnel-access/time-stats', {
      params: query,
    })
  })

  it('rejects an unsuccessful response instead of falling back to mock data', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { success: false, message: 'K30暂不可用', data: null },
    })

    await expect(getPersonnelSummary()).rejects.toThrow('K30暂不可用')
  })

  it('mirrors the original exit bars only when K30 has no exit direction data', () => {
    const base = deviceStats([deviceStat('2603093189098', 'S1人脸机-53.112', 8)])

    const displayed = buildPersonnelDeviceDisplayData(base)

    expect(displayed.items.find((item) => item.deviceName === 'E区')?.exitCount).toBe(8)
    expect(displayed.summary.exitTotal).toBe(8)
    expect(displayed.summary.totalCount).toBe(16)

    const withRealExit = deviceStats([deviceStat('2603093189098', 'S1人脸机-53.112', 8, 3)])
    const displayedWithRealExit = buildPersonnelDeviceDisplayData(withRealExit)
    expect(displayedWithRealExit.items.find((item) => item.deviceName === 'E区')?.exitCount).toBe(3)
    expect(displayedWithRealExit.summary.exitTotal).toBe(3)
  })

  it('groups K30 device records into SVG regions in a stable display order', () => {
    const base = deviceStats([
      deviceStat('2603093189098', 'S1人脸机-53.112', 2),
      deviceStat('26030512276CE', '人脸机53.113', 3),
      deviceStat('26030512276CE', 'S3人脸机-53.113', 1),
      deviceStat('2603051212818', 'X1人脸机-53.118', 4),
      deviceStat('2603093201352', 'X2人脸机-51.100', 5),
      deviceStat('260309316281B', 'S2人脸机-52.105', 6),
      deviceStat('26030931529A1', 'X3人脸机-52.100', 7),
      deviceStat('2603093144285', 'S4人脸机-52.106', 8),
      deviceStat('26030931798E7', 'X4人脸机-53.100', 9),
    ])

    const displayed = buildPersonnelDeviceDisplayData(base)

    expect(displayed.items.map((item) => item.deviceName)).toEqual([
      'A区',
      'F区',
      'E区',
      'D区',
      'L区',
      'K区',
      'J区',
    ])
    expect(displayed.items.map((item) => item.enterCount)).toEqual([0, 0, 2, 8, 5, 13, 17])
    expect(displayed.summary.enterTotal).toBe(45)
  })

  it('keeps future unmapped devices visible as unassigned instead of dropping their totals', () => {
    const base = deviceStats([deviceStat('future-device', '新接入设备', 4, 1, 2)])

    const displayed = buildPersonnelDeviceDisplayData(base)

    expect(displayed.items.at(-1)).toMatchObject({
      deviceName: '未分区',
      enterCount: 4,
      exitCount: 1,
      unknownCount: 2,
      totalCount: 7,
    })
  })
})
