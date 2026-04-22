import { checkHealth } from '@/api/health'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const DEFAULT_POLL_MS = 30_000

/** 应用内轮询后端健康检查（GET /health） */
export function useBackendHealth(pollMs: number = DEFAULT_POLL_MS) {
  const backendOnline = ref<boolean | null>(null)
  const healthError = ref<string | null>(null)

  let timer: number | null = null

  const probe = async () => {
    try {
      const ok = await checkHealth()
      backendOnline.value = ok
      healthError.value = ok ? null : '健康检查未通过'
    } catch (e) {
      backendOnline.value = false
      healthError.value = e instanceof Error ? e.message : String(e)
    }
  }

  onMounted(() => {
    void probe()
    timer = window.setInterval(() => void probe(), pollMs)
  })

  onBeforeUnmount(() => {
    if (timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  })

  return { backendOnline, healthError, probe }
}
