import { apiClient } from '@/api/client'
import {
  buildPersonnelDeviceDisplayData,
  getPersonnelDepartmentStats,
  getPersonnelDeviceStats,
  getPersonnelSummary,
  getPersonnelTimeStats,
} from '@/api/personnel-access'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = vi.mocked(apiClient.get)

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
    const base = {
      granularity: 'day' as const,
      anchor: '2026-08-25',
      periodLabel: '2026年8月25日',
      periodStart: '2026-08-25',
      periodEnd: '2026-08-25',
      granularityOptions: [],
      coverageStartAt: '2026-08-25 17:50:44',
      partial: true,
      observedAt: '2026-08-25T20:00:00+08:00',
      source: 'K30' as const,
      items: [
        {
          deviceId: 'device-1',
          deviceName: '人脸机一号',
          enterCount: 8,
          exitCount: 0,
          unknownCount: 0,
          totalCount: 8,
        },
      ],
      summary: { enterTotal: 8, exitTotal: 0, unknownTotal: 0, totalCount: 8 },
    }

    const displayed = buildPersonnelDeviceDisplayData(base)

    expect(displayed.items[0]?.exitCount).toBe(8)
    expect(displayed.summary.exitTotal).toBe(8)
    expect(displayed.summary.totalCount).toBe(16)

    const withRealExit = {
      ...base,
      items: [{ ...base.items[0]!, exitCount: 3, totalCount: 11 }],
      summary: { ...base.summary, exitTotal: 3, totalCount: 11 },
    }
    expect(buildPersonnelDeviceDisplayData(withRealExit)).toBe(withRealExit)
  })
})
