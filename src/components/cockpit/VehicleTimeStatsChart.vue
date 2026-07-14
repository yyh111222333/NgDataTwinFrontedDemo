<!-- 车辆进出 — 进出时间分布 -->
<script setup lang="ts">
import { getVehicleTimeStats } from '@/api/vehicle-access'
import TimeDistributionChart from '@/components/cockpit/TimeDistributionChart.vue'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import type { VehicleAccessGranularity } from '@/types/vehicle-access'

const granularity = defineModel<VehicleAccessGranularity>('granularity', { default: 'day' })

const loadVehicleTimeStats = (
  query: { granularity: AccessStatsGranularity; anchor: string },
  options?: { useMock: boolean },
) => getVehicleTimeStats(query, options)
</script>

<template>
  <TimeDistributionChart
    v-model:granularity="granularity"
    :loader="loadVehicleTimeStats"
    :use-mock="false"
    :refresh-interval-ms="10000"
  />
</template>
