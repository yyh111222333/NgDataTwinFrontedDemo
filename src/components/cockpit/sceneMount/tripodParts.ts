/** 三辊闸分组内部件（data-name 优先，兼容 id 后缀） */
const queryInGroup = (group: Element, selectors: string[]): Element | null => {
  for (const selector of selectors) {
    const el = group.querySelector(selector)
    if (el) return el
  }
  return null
}

export const queryTripodRoute = (group: Element, index: 1 | 2 | 3): SVGPathElement | null => {
  const suffix = `route_0${index}`
  const el = queryInGroup(group, [
    `path[data-name="${suffix}"]`,
    `path[id="${suffix}"]`,
    `path[id^="${suffix}-"]`,
  ])
  return el instanceof SVGPathElement ? el : null
}

export const queryTripodRotor = (group: Element, index: 1 | 2 | 3): SVGLineElement | null => {
  const suffix = `rotor_0${index}`
  const el = queryInGroup(group, [
    `line[data-name="${suffix}"]`,
    `line[id="${suffix}"]`,
    `line[id^="${suffix}-"]`,
  ])
  return el instanceof SVGLineElement ? el : null
}

export const queryTripodPivot = (group: Element): SVGCircleElement | null => {
  const el = queryInGroup(group, ['circle[data-name="pivot"]', 'circle[id="pivot"]', 'circle[id^="pivot-"]'])
  return el instanceof SVGCircleElement ? el : null
}

export const queryTripodRoutes = (group: Element): SVGPathElement[] => {
  return ([1, 2, 3] as const)
    .map((index) => queryTripodRoute(group, index))
    .filter((el): el is SVGPathElement => el !== null)
}

export const queryTripodRotors = (group: Element): SVGLineElement[] => {
  return ([1, 2, 3] as const)
    .map((index) => queryTripodRotor(group, index))
    .filter((el): el is SVGLineElement => el !== null)
}
