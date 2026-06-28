<!-- 人员进出 — 进出时间分布 -->
<script setup lang="ts">
import { getPersonnelTimeStats } from '@/api/personnel-access'
import TimeDistributionChart from '@/components/cockpit/TimeDistributionChart.vue'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import type { PersonnelAccessGranularity } from '@/types/personnel-access'

const granularity = defineModel<PersonnelAccessGranularity>('granularity', { default: 'day' })

const loadPersonnelTimeStats = (
  query: { granularity: AccessStatsGranularity; anchor: string },
  _options?: { useMock: boolean },
) => getPersonnelTimeStats(query, { useMock: true })
</script>

<template>
  <TimeDistributionChart v-model:granularity="granularity" :loader="loadPersonnelTimeStats" />
</template>
