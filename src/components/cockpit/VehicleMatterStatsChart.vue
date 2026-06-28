<!-- 车辆进出 — 事项分布 -->
<script setup lang="ts">
import { getVehicleMatterStats } from '@/api/vehicle-access'
import MatterPieStatsChart from '@/components/cockpit/MatterPieStatsChart.vue'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import { VEHICLE_MATTER_TYPES, type VehicleAccessGranularity } from '@/types/vehicle-access'

const granularity = defineModel<VehicleAccessGranularity>('granularity', { default: 'day' })

const loadVehicleMatterStats = (
  query: { granularity: AccessStatsGranularity; anchor: string },
  _options?: { useMock: boolean },
) => getVehicleMatterStats(query, { useMock: true })
</script>

<template>
  <MatterPieStatsChart
    v-model:granularity="granularity"
    :matter-types="VEHICLE_MATTER_TYPES"
    :loader="loadVehicleMatterStats"
    summary-label="总事项"
  />
</template>
