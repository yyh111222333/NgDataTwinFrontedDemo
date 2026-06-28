import { buildRelayDoorStatusSnapshot, getRelayDoorStatus } from '@/api/relay-door-status'
import type { RelayDoorStatusSnapshot } from '@/types/relay-door-status'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

export type UseRelayDoorStatusOptions = {
  enabled: Ref<boolean>
  validDoorIds: ReadonlySet<string>
  intervalMs?: number
  onUpdate: (snapshot: RelayDoorStatusSnapshot) => void
  onError?: (error: unknown) => void
}

export const useRelayDoorStatus = (options: UseRelayDoorStatusOptions) => {
  const intervalMs = options.intervalMs ?? 1_000
  let previousDoorStates: Record<string, boolean | undefined> = {}
  let timer: number | null = null
  let polling = false

  const pollOnce = async () => {
    if (!options.enabled.value || polling) return
    polling = true
    try {
      const status = await getRelayDoorStatus()
      const snapshot = buildRelayDoorStatusSnapshot(
        status,
        previousDoorStates,
        options.validDoorIds,
      )
      previousDoorStates = { ...snapshot.doorStates }
      options.onUpdate(snapshot)
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
