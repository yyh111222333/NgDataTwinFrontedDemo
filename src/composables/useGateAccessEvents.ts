import { getGateAccessEvents } from '@/api/gate-access'
import type { GateAccessEvent } from '@/types/gate-access'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type UseGateAccessEventsOptions = {
  /** 是否启用轮询 */
  enabled: Ref<boolean>
  /** Mock / API 数据源 */
  useMock: Ref<boolean>
  /** 可动画门 ID，Mock 随机选门用 */
  animatableDoorIds: string[]
  validDoorIds: ReadonlySet<string>
  /** 收到新事件时回调 */
  onEvents: (events: GateAccessEvent[]) => void
  /** 轮询间隔，默认 3s */
  intervalMs?: number
  onError?: (error: unknown) => void
}

/** 轮询 /api/gate-access/events，增量消费 cursor */
export const useGateAccessEvents = (options: UseGateAccessEventsOptions) => {
  const intervalMs = options.intervalMs ?? 3_000
  let cursor: string | undefined
  let timer: number | null = null
  let polling = false

  const pollOnce = async () => {
    if (!options.enabled.value || polling) return
    polling = true
    try {
      const data = await getGateAccessEvents({
        cursor,
        useMock: options.useMock.value,
        animatableDoorIds: options.animatableDoorIds,
        validDoorIds: options.validDoorIds,
      })

      if (data.cursor) {
        cursor = data.cursor
      }
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

  onMounted(start)
  onBeforeUnmount(stop)

  return { pollOnce, stop, start }
}
