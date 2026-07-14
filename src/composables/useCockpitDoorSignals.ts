import { getCockpitDoorSignals } from '@/api/cockpit-door-signal'
import type { CockpitDoorSignal } from '@/types/cockpit-door-signal'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type UseCockpitDoorSignalsOptions = {
  enabled: Ref<boolean>
  validDoorIds: ReadonlySet<string>
  intervalMs?: number
  onSignals: (signals: CockpitDoorSignal[]) => void
  onError?: (error: unknown) => void
}

/**
 * 轮询 8084 门状态接口。首次成功请求只建立版本基线，避免重放历史测试状态；
 * 后续按每个源门的 updatedAt/open/direction 变化触发场景动画。
 */
export const useCockpitDoorSignals = (options: UseCockpitDoorSignalsOptions) => {
  const intervalMs = options.intervalMs ?? 1_000
  let previousVersions: Record<string, string> = {}
  let initialized = false
  let timer: number | null = null
  let polling = false

  const pollOnce = async () => {
    if (!options.enabled.value || polling) return
    polling = true
    try {
      const signals = await getCockpitDoorSignals(options.validDoorIds)
      const nextVersions = Object.fromEntries(
        signals.map((signal) => [signal.sourceDoorId, signal.version]),
      )

      if (initialized) {
        const changed = signals.filter((signal) => {
          const previous = previousVersions[signal.sourceDoorId]
          return previous !== undefined && previous !== signal.version
        })
        if (changed.length > 0) options.onSignals(changed)
      }

      previousVersions = nextVersions
      initialized = true
    } catch (error) {
      options.onError?.(error)
    } finally {
      polling = false
    }
  }

  const start = () => {
    if (timer !== null) return
    void pollOnce()
    timer = window.setInterval(() => void pollOnce(), intervalMs)
  }

  const stop = () => {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { pollOnce, start, stop }
}
