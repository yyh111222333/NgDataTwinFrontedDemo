import { getCockpitDoorSignals } from '@/api/cockpit-door-signal'
import type { CockpitDoorSignal } from '@/types/cockpit-door-signal'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type UseCockpitDoorSignalsOptions = {
  enabled: Ref<boolean>
  validDoorIds: ReadonlySet<string>
  intervalMs?: number
  transientResetMs?: number
  onSignals: (signals: CockpitDoorSignal[]) => void
  onError?: (error: unknown) => void
}

/**
 * 轮询人员、车辆子系统的真实通行记录。首次成功请求只建立版本基线，
 * 避免重放历史记录；后续按每个源门的事件版本变化触发场景动画。
 */
export const useCockpitDoorSignals = (options: UseCockpitDoorSignalsOptions) => {
  const intervalMs = options.intervalMs ?? 1_000
  const transientResetMs = options.transientResetMs ?? 2_500
  let previousVersions: Record<string, string> = {}
  let initialized = false
  let timer: number | null = null
  let polling = false
  const resetTimers = new Map<string, number>()

  const scheduleTransientReset = (signal: CockpitDoorSignal) => {
    if (!signal.transient || !signal.open) return

    const previousTimer = resetTimers.get(signal.sourceDoorId)
    if (previousTimer !== undefined) window.clearTimeout(previousTimer)

    const resetTimer = window.setTimeout(() => {
      resetTimers.delete(signal.sourceDoorId)
      options.onSignals([
        {
          ...signal,
          open: false,
          transient: false,
          silent: true,
          version: `${signal.version}|reset`,
        },
      ])
    }, transientResetMs)
    resetTimers.set(signal.sourceDoorId, resetTimer)
  }

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
          return previous !== signal.version
        })
        if (changed.length > 0) {
          options.onSignals(changed)
          changed.forEach(scheduleTransientReset)
        }
      }

      previousVersions = { ...previousVersions, ...nextVersions }
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
    resetTimers.forEach((resetTimer) => window.clearTimeout(resetTimer))
    resetTimers.clear()
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { pollOnce, start, stop }
}
