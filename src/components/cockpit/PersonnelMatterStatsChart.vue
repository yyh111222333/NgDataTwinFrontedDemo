<!-- 人员进出 — 事项分布 -->
<script setup lang="ts">
import { getPersonnelMatterStats } from '@/api/personnel-access'
import MatterPieStatsChart from '@/components/cockpit/MatterPieStatsChart.vue'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import { PERSONNEL_MATTER_TYPES, type PersonnelAccessGranularity } from '@/types/personnel-access'

const granularity = defineModel<PersonnelAccessGranularity>('granularity', { default: 'day' })

const loadPersonnelMatterStats = (
  query: { granularity: AccessStatsGranularity; anchor: string },
  _options?: { useMock: boolean },
) => getPersonnelMatterStats(query, { useMock: true })
</script>

<template>
  <MatterPieStatsChart
    v-model:granularity="granularity"
    :matter-types="PERSONNEL_MATTER_TYPES"
    :loader="loadPersonnelMatterStats"
    summary-label="总事项"
  />
</template>
