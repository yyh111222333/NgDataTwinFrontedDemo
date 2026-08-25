import { apiClient } from '@/api/client'
import {
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
})
