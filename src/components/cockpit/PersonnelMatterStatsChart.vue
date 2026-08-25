<!-- 人员进出 — 真实部门通行分布 -->
<script setup lang="ts">
import { getPersonnelDepartmentStats } from '@/api/personnel-access'
import MatterPieStatsChart from '@/components/cockpit/MatterPieStatsChart.vue'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import type { PersonnelAccessGranularity } from '@/types/personnel-access'

const granularity = defineModel<PersonnelAccessGranularity>('granularity', { default: 'day' })

const loadPersonnelDepartmentStats = async (query: {
  granularity: AccessStatsGranularity
  anchor: string
}) => {
  const data = await getPersonnelDepartmentStats(query)
  return {
    ...data,
    items: data.items.map((item) => ({
      matterId: item.departmentId,
      matterName: item.departmentName,
      count: item.count,
    })),
  }
}
</script>

<template>
  <MatterPieStatsChart
    v-model:granularity="granularity"
    :matter-types="[]"
    :loader="loadPersonnelDepartmentStats"
    :use-mock="false"
    summary-label="通行总数"
  />
</template>
