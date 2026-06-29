import { getGateAccessEvents } from '@/api/gate-access'
import type { GateAccessEvent, GateAccessEventsData } from '@/types/gate-access'
import { onBeforeUnmount, type Ref, watch } from 'vue'

export type UseGateAccessEventsOptions = {
  enabled: Ref<boolean>
  useMock: Ref<boolean>
  animatableDoorIds: readonly string[]
  validDoorIds: ReadonlySet<string>
  intervalMs?: number
  cursor: Ref<string | undefined>
  onEvents: (events: GateAccessEvent[]) => void
  onPoll?: (data: GateAccessEventsData) => void
  onError?: (error: unknown) => void
}

/**
 * 增量轮询过门事件（Mock / 真实 API 同一入口）。
 * 首次 enabled 时不带 cursor；之后使用上次响应 cursor。
 */
export const useGateAccessEvents = (options: UseGateAccessEventsOptions) => {
  const intervalMs = options.intervalMs ?? 2_500
  let timer: number | null = null
  let polling = false

  const pollOnce = async () => {
    if (!options.enabled.value || polling) return
    polling = true
    try {
      const data = await getGateAccessEvents({
        cursor: options.cursor.value,
        limit: 20,
        useMock: options.useMock.value,
        animatableDoorIds: [...options.animatableDoorIds],
        validDoorIds: options.validDoorIds,
      })

      if (data.cursor) {
        options.cursor.value = data.cursor
      }

      options.onPoll?.(data)

      if (data.events.length > 0) {
        options.onEvents(data.events)
      }
    } catch (error) {
      options.onError?.(error)
    } finally {
      polling = false
    }
  }

  const start = () => {
    if (timer !== null) return
    void pollOnce()
    timer = window.setInterval(() => {
      void pollOnce()
    }, intervalMs)
  }

  const stop = () => {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }

  watch(
    options.enabled,
    (active) => {
      if (active) {
        start()
      } else {
        stop()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(stop)

  return { pollOnce, start, stop }
}
