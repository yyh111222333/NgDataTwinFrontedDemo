// SVG 解析模块：从 demo.svg 提取门禁几何、墙体与绘制样式数据。
export type SvgPaint = { stroke?: string; fill?: string; strokeWidth?: number }
export type Point = { x: number; y: number }
export type Line = { x1: number; y1: number; x2: number; y2: number; paint: SvgPaint }
export type Polyline = { points: string; paint: SvgPaint }
export type Rect = { x: number; y: number; width: number; height: number }

export type GateGeometry = {
  id: string
  routes: [string, string, string]
  pivot: Point
  pivotRadius: number
  pivotPaint: SvgPaint
  rotorPaint: SvgPaint
  staticOutline: Rect | null
  staticOutlinePaint: SvgPaint
  staticInner: Rect | null
  staticInnerPaint: SvgPaint
  staticLines: Line[]
}

export type PersonGateGeometry = {
  id: string
  leaf: Line
  pivot: Point
  pivotRadius: number
  pivotPaint: SvgPaint
}

type SvgClassStyle = { strokeWidth?: number; stroke?: string; fill?: string }

const parseNumber = (v: string | null) => Number(v ?? '0')
// 兼容 "6px" / "6" / "-1.2px" 这类 CSS 数值字符串。
const parseCssNumber = (v: string | null) => {
  if (!v) return 0
  const m = v.match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}

const parseClassStyleMap = (svgRaw: string): Record<string, SvgClassStyle> => {
  const map: Record<string, SvgClassStyle> = {}
  const classBlockRegex = /([^{}]+)\{([^}]*)\}/g
  let m: RegExpExecArray | null = null
  while ((m = classBlockRegex.exec(svgRaw)) !== null) {
    const selectorGroup = m[1] ?? ''
    const body = m[2] ?? ''
    // 支持 ".cls-1, .cls-2 { ... }" 这种逗号分组写法。
    const selectors = selectorGroup
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('.'))
      .map((s) => s.slice(1))
    if (selectors.length === 0) continue
    const rule: SvgClassStyle = {}
    const widthMatch = body.match(/stroke-width\s*:\s*([^;]+);?/i)
    if (widthMatch) rule.strokeWidth = parseCssNumber(widthMatch[1] ?? '0')
    const strokeMatch = body.match(/stroke\s*:\s*([^;]+);?/i)
    if (strokeMatch) rule.stroke = (strokeMatch[1] ?? '').trim()
    const fillMatch = body.match(/fill\s*:\s*([^;]+);?/i)
    if (fillMatch) rule.fill = (fillMatch[1] ?? '').trim()
    selectors.forEach((cls) => {
      map[cls] = { ...(map[cls] ?? {}), ...rule }
    })
  }
  return map
}

const getPaint = (el: Element | null, classMap: Record<string, SvgClassStyle>): SvgPaint => {
  if (!el) return {}
  const paint: SvgPaint = {}
  // 先读取 class 规则，再由元素内联属性覆盖（inline 优先级更高）。
  const classNames = (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
  for (const cls of classNames) {
    const c = classMap[cls]
    if (!c) continue
    if (paint.strokeWidth === undefined && typeof c.strokeWidth === 'number' && c.strokeWidth > 0) {
      paint.strokeWidth = c.strokeWidth
    }
    if (paint.stroke === undefined && c.stroke) paint.stroke = c.stroke
    if (paint.fill === undefined && c.fill) paint.fill = c.fill
  }
  const inlineWidth = parseCssNumber(el.getAttribute('stroke-width'))
  if (inlineWidth > 0) paint.strokeWidth = inlineWidth
  const inlineStroke = el.getAttribute('stroke')
  if (inlineStroke) paint.stroke = inlineStroke
  const inlineFill = el.getAttribute('fill')
  if (inlineFill) paint.fill = inlineFill
  return paint
}

const parseRect = (el: Element | null): Rect | null => {
  if (!el) return null
  return {
    x: parseNumber(el.getAttribute('x')),
    y: parseNumber(el.getAttribute('y')),
    width: parseNumber(el.getAttribute('width')),
    height: parseNumber(el.getAttribute('height')),
  }
}

const parseLine = (el: Element, classMap: Record<string, SvgClassStyle>): Line => ({
  x1: parseNumber(el.getAttribute('x1')),
  y1: parseNumber(el.getAttribute('y1')),
  x2: parseNumber(el.getAttribute('x2')),
  y2: parseNumber(el.getAttribute('y2')),
  paint: getPaint(el, classMap),
})

const parsePolyline = (el: Element, classMap: Record<string, SvgClassStyle>): Polyline => ({
  points: el.getAttribute('points') ?? '',
  paint: getPaint(el, classMap),
})

const parseWalls = (doc: Document, classMap: Record<string, SvgClassStyle>) => {
  const wallPolylines = Array.from(doc.querySelectorAll('polyline[id^="wall"]'))
    .map((el) => parsePolyline(el, classMap))
    .filter((it) => it.points.trim().length > 0)
  const wallLines = Array.from(doc.querySelectorAll('line[id^="wall"]')).map((el) => parseLine(el, classMap))
  return { wallLines, wallPolylines }
}

// 解析人员门：leaf 为可动门扇，pivot 为旋转中心。
const parsePersonGateGeometries = (doc: Document, classMap: Record<string, SvgClassStyle>) => {
  const leafEls = Array.from(doc.querySelectorAll('[id$="_leaf"]'))
  const out: Record<string, PersonGateGeometry> = {}
  leafEls.forEach((el) => {
    const leafId = el.getAttribute('id') ?? ''
    const base = leafId.replace(/_leaf$/i, '')
    if (!base.startsWith('gate_person_')) return
    const pivotEl = doc.getElementById(`${base}_pivot`)
    if (!pivotEl) return
    out[base] = {
      id: base,
      leaf: parseLine(el, classMap),
      pivot: {
        x: parseNumber(pivotEl.getAttribute('cx')),
        y: parseNumber(pivotEl.getAttribute('cy')),
      },
      pivotRadius: parseNumber(pivotEl.getAttribute('r')),
      pivotPaint: getPaint(pivotEl, classMap),
    }
  })
  return out
}

// 解析三辊闸：3条轨迹 + pivot + rotor + static 外形信息。
const parseTripodGeometries = (doc: Document, classMap: Record<string, SvgClassStyle>) => {
  const routeEls = Array.from(doc.querySelectorAll('[id$="_route_01"]'))
  const out: Record<string, GateGeometry> = {}
  routeEls.forEach((el) => {
    const id = el.getAttribute('id') ?? ''
    const base = id.replace(/_route_01$/i, '')
    if (!base.startsWith('gate_tripod_')) return
    const route1 = doc.getElementById(`${base}_route_01`)?.getAttribute('d') ?? ''
    const route2 = doc.getElementById(`${base}_route_02`)?.getAttribute('d') ?? ''
    const route3 = doc.getElementById(`${base}_route_03`)?.getAttribute('d') ?? ''
    if (!route1 || !route2 || !route3) return
    const pivotEl = doc.getElementById(`${base}_pivot`)
    const rotorEl = doc.getElementById(`${base}_rotor_01`)
    const staticOutlineEl = doc.getElementById(`${base}_static`)
    const staticInnerEl = doc.getElementById(`${base}_static-2`)
    const staticLines = [3, 4, 5, 6]
      .map((n) => doc.getElementById(`${base}_static-${n}`))
      .filter((v): v is HTMLElement => v !== null)
      .map((it) => parseLine(it, classMap))

    out[base] = {
      id: base,
      routes: [route1, route2, route3],
      pivot: {
        x: parseNumber(pivotEl?.getAttribute('cx') ?? '0'),
        y: parseNumber(pivotEl?.getAttribute('cy') ?? '0'),
      },
      pivotRadius: parseNumber(pivotEl?.getAttribute('r') ?? null),
      pivotPaint: getPaint(pivotEl, classMap),
      rotorPaint: getPaint(rotorEl, classMap),
      staticOutline: parseRect(staticOutlineEl),
      staticOutlinePaint: getPaint(staticOutlineEl, classMap),
      staticInner: parseRect(staticInnerEl),
      staticInnerPaint: getPaint(staticInnerEl, classMap),
      staticLines,
    }
  })
  return out
}

// 对外统一入口：一次性输出 SceneMount 渲染所需几何数据。
export const parseSceneGeometry = (svgRaw: string) => {
  if (typeof DOMParser === 'undefined') {
    return {
      gateGeometries: {} as Record<string, GateGeometry>,
      personGateGeometries: {} as Record<string, PersonGateGeometry>,
      wallLines: [] as Line[],
      wallPolylines: [] as Polyline[],
    }
  }
  const classMap = parseClassStyleMap(svgRaw)
  const doc = new DOMParser().parseFromString(svgRaw, 'image/svg+xml')
  return {
    gateGeometries: parseTripodGeometries(doc, classMap),
    personGateGeometries: parsePersonGateGeometries(doc, classMap),
    ...parseWalls(doc, classMap),
  }
}
