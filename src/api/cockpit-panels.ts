import { apiClient } from '@/api/client'
import type { CockpitPanelApiResponse, CockpitPanelData, CockpitPanelKey } from '@/types/cockpit'

/** GET /api/cockpit/v1/panels/{panelKey} */
export async function getCockpitPanel(panelKey: CockpitPanelKey): Promise<CockpitPanelData> {
  const { data: body } = await apiClient.get<CockpitPanelApiResponse>(
    `/api/cockpit/v1/panels/${panelKey}`,
  )
  if (!body.success || body.data == null) {
    throw new Error(body.message || `获取面板 ${panelKey} 失败`)
  }
  return body.data
}
