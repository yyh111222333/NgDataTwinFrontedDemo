import { apiClient } from '@/api/client'
import { resolveUseMock } from '@/api/resolve-use-mock'
import { buildVehicleChannelStatsMock } from '@/mocks/vehicle-access-channel-stats'
import { buildVehicleMatterStatsMock } from '@/mocks/vehicle-access-matter-stats'
import { buildVehicleTimeStatsMock } from '@/mocks/vehicle-access-time-stats'
import type {
  VehicleChannelStatsApiResponse,
  VehicleChannelStatsData,
  VehicleChannelStatsQuery,
  VehicleMatterStatsApiResponse,
  VehicleMatterStatsData,
  VehicleMatterStatsQuery,
  VehicleTimeStatsApiResponse,
  VehicleTimeStatsData,
  VehicleTimeStatsQuery,
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
  if (resolveUseMock(options)) {
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

/** GET /api/vehicle-access/matter-stats */
export async function getVehicleMatterStats(
  query: VehicleMatterStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleMatterStatsData> {
  if (resolveUseMock(options)) {
    return buildVehicleMatterStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<VehicleMatterStatsApiResponse>(
    '/api/vehicle-access/matter-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取车辆事项分布失败')
  }
  return body.data
}

/** GET /api/vehicle-access/time-stats */
export async function getVehicleTimeStats(
  query: VehicleTimeStatsQuery,
  options?: { useMock?: boolean },
): Promise<VehicleTimeStatsData> {
  if (resolveUseMock(options)) {
    return buildVehicleTimeStatsMock(query.granularity, query.anchor)
  }

  const { data: body } = await apiClient.get<VehicleTimeStatsApiResponse>(
    '/api/vehicle-access/time-stats',
    { params: query },
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || '获取车辆进出时间分布失败')
  }
  return body.data
}
