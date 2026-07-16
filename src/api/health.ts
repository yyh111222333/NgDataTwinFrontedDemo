import { apiClient } from '@/api/client'

/** Nginx将GET /health转发到FastAPI就绪检查。 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await apiClient.get<unknown>('/health', { timeout: 8_000 })
    return res.status === 200
  } catch {
    return false
  }
}
