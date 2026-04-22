import { apiClient } from '@/api/client'

/** GET /health  HTTP 200 判定为在线 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await apiClient.get<unknown>('/health', { timeout: 8_000 })
    return res.status === 200
  } catch {
    return false
  }
}
