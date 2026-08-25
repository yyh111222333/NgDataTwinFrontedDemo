<!-- 人员进出 — 事项分布，沿用原图表样式并填充真实部门通行数据。 -->
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
    :refresh-interval-ms="10000"
    summary-label="总事项"
  />
</template>
