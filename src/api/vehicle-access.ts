import { apiClient } from '@/api/client'
import { buildVehicleChannelStatsMock } from '@/mocks/vehicle-access-channel-stats'
import type {
  VehicleChannelStatsApiResponse,
  VehicleChannelStatsData,
  VehicleChannelStatsQuery,
} from '@/types/vehicle-access'

/**
 * 车辆进出 — 通道进出统计
 *
 * GET /api/vehicle-access/channel-stats
 */
export async function getVehicleChannelStats(
  query: VehicleChannelStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleChannelStatsData> {
  if (options?.useMock) {
    return buildVehicleChannelStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<VehicleChannelStatsApiResponse>(
    '/api/vehicle-access/channel-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取通道进出统计失败')
  }
  return body.data
}
