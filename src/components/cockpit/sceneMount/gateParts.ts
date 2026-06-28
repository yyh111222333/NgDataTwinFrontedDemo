/** 门禁分组内固定三部分：static / pivot / leaf（data-name） */
export const queryGateStatic = (group: Element): SVGPathElement | null => {
  const el = group.querySelector('path[data-name="static"]')
  return el instanceof SVGPathElement ? el : null
}

export const queryGatePivot = (group: Element): SVGCircleElement | null => {
  const el = group.querySelector('circle[data-name="pivot"]')
  return el instanceof SVGCircleElement ? el : null
}

export const queryGateLeaf = (group: Element): SVGGraphicsElement | null => {
  const pathEl = group.querySelector('path[data-name="leaf"]')
  if (pathEl instanceof SVGGraphicsElement) return pathEl
  const lineEl = group.querySelector('line[data-name="leaf"]')
  if (lineEl instanceof SVGGraphicsElement) return lineEl
  return null
}
