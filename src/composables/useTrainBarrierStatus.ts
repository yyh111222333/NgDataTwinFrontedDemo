import {
  buildTrainBarrierStatusSnapshot,
  getTrainBarrierStatus,
} from '@/api/train-barrier'
import type { TrainBarrierStatusSnapshot } from '@/types/train-barrier'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type UseTrainBarrierStatusOptions = {
  enabled: Ref<boolean>
  validDoorIds: ReadonlySet<string>
  intervalMs?: number
  onUpdate: (snapshot: TrainBarrierStatusSnapshot) => void
  onError?: (error: unknown) => void
}

export const useTrainBarrierStatus = (options: UseTrainBarrierStatusOptions) => {
  const intervalMs = options.intervalMs ?? 1_000
  let timer: number | null = null
  let polling = false

  const pollOnce = async () => {
    if (!options.enabled.value || polling) return
    polling = true
    try {
      const status = await getTrainBarrierStatus()
      options.onUpdate(buildTrainBarrierStatusSnapshot(status, options.validDoorIds))
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

  return { pollOnce, start, stop }
}
