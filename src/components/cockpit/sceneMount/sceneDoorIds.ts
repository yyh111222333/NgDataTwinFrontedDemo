/** 从厂区 SVG 提取可动画道闸/门禁 id（vehicleBarrier_* / trainBarrier_* /  legacy gate_*） */
export const extractSceneDoorIds = (svgRaw: string): string[] => {
  const currentIds = new Set<string>()
  const legacyIds = new Set<string>()
  const idRegex = /\sid="([^"]+)"/g
  let match: RegExpExecArray | null = null

  while ((match = idRegex.exec(svgRaw)) !== null) {
    const id = match[1] ?? ''
    if (
      /^vehicleBarrier_[\w\d]+$/.test(id) ||
      /^trainBarrier_[\w\d]+$/.test(id) ||
      /^fullheight_[\w\d]+$/.test(id) ||
      /^tripod_[\w\d]+$/.test(id) ||
      /^person_[\w\d]+$/.test(id)
    ) {
      currentIds.add(id)
      continue
    }

    const normalized = id
      .replace(/_route_\d+$/i, '')
      .replace(/_rotor_\d+$/i, '')
      .replace(/_leaf(?:_\d+)?$/i, '')
      .replace(/_pivot(?:-\d+)?$/i, '')
      .replace(/_static(?:-\d+)?$/i, '')

    if (normalized.startsWith('door_') || normalized.startsWith('gate_')) {
      legacyIds.add(normalized)
    }
  }

  const out = currentIds.size > 0 ? currentIds : legacyIds
  return Array.from(out).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export const groupSceneDoorLabel = (doorId: string) => {
  if (doorId.startsWith('vehicleBarrier_')) return '汽车道闸'
  if (doorId.startsWith('trainBarrier_')) return '火车道闸'
  if (doorId.startsWith('tripod_')) return '火车道管控门'
  if (doorId.startsWith('fullheight_')) return '人脸门禁'
  if (doorId.startsWith('person_')) return '连锁管控门'
  if (doorId.startsWith('gate_barrier_')) return '道闸'
  if (doorId.startsWith('gate_tripod_')) return '三辊闸'
  if (doorId.startsWith('gate_person_')) return '人员门'
  if (doorId.startsWith('gate_fullheight_')) return '全高闸'
  return '门禁'
}
