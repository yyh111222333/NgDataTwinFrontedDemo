import { defaultAccessStatsAnchors, resolveAccessStatsAnchor } from '@/mocks/access-stats-shared'
import type { AccessStatsGranularity } from '@/mocks/access-stats-shared'
import { computed, onMounted, ref, watch, type Ref } from 'vue'

type GranularityQuery = {
  granularity: AccessStatsGranularity
  anchor: string
}

type GranularityOptions = ReadonlyArray<{ value: AccessStatsGranularity; label: string }>

export function useGranularityStatsChart<T extends { granularityOptions?: GranularityOptions }>(
  loader: (query: GranularityQuery, options: { useMock: boolean }) => Promise<T>,
  useMock = true,
  sharedGranularity?: Ref<AccessStatsGranularity>,
) {
  const granularity = sharedGranularity ?? ref<AccessStatsGranularity>('day')
  const statsData = ref<T | null>(null)
  const loading = ref(false)
  const loadError = ref<string | null>(null)

  const loadStats = async () => {
    loading.value = true
    loadError.value = null
    try {
      statsData.value = await loader(
        {
          granularity: granularity.value,
          anchor: resolveAccessStatsAnchor(granularity.value),
        },
        { useMock },
      )
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e)
      statsData.value = null
    } finally {
      loading.value = false
    }
  }

  watch(granularity, () => {
    void loadStats()
  })

  onMounted(() => {
    void loadStats()
  })

  const granularityOptions = computed(
    () =>
      statsData.value?.granularityOptions ?? [
        { value: 'day' as const, label: '按日统计' },
        { value: 'month' as const, label: '按月统计' },
        { value: 'year' as const, label: '按年统计' },
      ],
  )

  return {
    granularity,
    statsData,
    loading,
    loadError,
    granularityOptions,
    loadStats,
  }
}

export { defaultAccessStatsAnchors, resolveAccessStatsAnchor }
