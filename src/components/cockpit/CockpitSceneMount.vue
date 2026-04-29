<script setup lang="ts">
import demoSvgRaw from '@/assets/demo.svg?raw'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

// 该组件将 demo.svg 解析为“静态结构 + 可动门元数据”，并统一管理门动画生命周期。
type Point = { x: number; y: number }
type Slot = 1 | 2 | 3
type DoorFlowDirection = 'out' | 'in'
type TransitionSpec = { routeIndex: number; reverse: boolean }
type SvgPaint = { stroke?: string; fill?: string; strokeWidth?: number }
type Line = { x1: number; y1: number; x2: number; y2: number; paint: SvgPaint }
type Polyline = { points: string; paint: SvgPaint }
type SvgClassStyle = { strokeWidth?: number; stroke?: string; fill?: string }
type Rect = { x: number; y: number; width: number; height: number }
type GateGeometry = {
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
type GateRuntime = {
  routeRefs: Array<SVGPathElement | null>
  rotorEndpoints: Point[]
  rotorSlots: Slot[]
  rotorBrightness: number[]
  ready: boolean
  rafId: number | null
}
type PersonGateGeometry = {
  id: string
  leaf: Line
  pivot: Point
  pivotRadius: number
  pivotPaint: SvgPaint
}
type PersonGateRuntime = {
  angleDeg: number
  rafId: number | null
}

const props = defineProps<{
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
}>()

// 单次开门/关门动画总时长（tripod 与 person 统一）。
const DURATION_MS = 3000

const parseNumber = (v: string | null) => Number(v ?? '0')
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

// 读取元素可见样式（class + inline），inline 优先级更高。
const getPaint = (el: Element | null, classMap: Record<string, SvgClassStyle>): SvgPaint => {
  if (!el) return {}
  const paint: SvgPaint = {}
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

const parseWalls = (
  svgRaw: string,
  classMap: Record<string, SvgClassStyle>,
): { wallLines: Line[]; wallPolylines: Polyline[] } => {
  if (typeof DOMParser === 'undefined') return { wallLines: [], wallPolylines: [] }
  const doc = new DOMParser().parseFromString(svgRaw, 'image/svg+xml')
  const wallPolylines = Array.from(doc.querySelectorAll('polyline[id^="wall"]'))
    .map((el) => parsePolyline(el, classMap))
    .filter((it) => it.points.trim().length > 0)
  const wallLines = Array.from(doc.querySelectorAll('line[id^="wall"]')).map((el) => parseLine(el, classMap))
  return { wallLines, wallPolylines }
}

// gate_person_*：解析叶片与铰点，供“进/出”摆门动画使用。
const parsePersonGateGeometries = (
  svgRaw: string,
  classMap: Record<string, SvgClassStyle>,
): Record<string, PersonGateGeometry> => {
  if (typeof DOMParser === 'undefined') return {}
  const doc = new DOMParser().parseFromString(svgRaw, 'image/svg+xml')
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

// gate_tripod_*：解析三条轨迹、pivot 与静态外形，供三辊闸动画使用。
const parseTripodGeometries = (
  svgRaw: string,
  classMap: Record<string, SvgClassStyle>,
): Record<string, GateGeometry> => {
  if (typeof DOMParser === 'undefined') return {}
  const doc = new DOMParser().parseFromString(svgRaw, 'image/svg+xml')
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
    const pivot: Point = {
      x: parseNumber(pivotEl?.getAttribute('cx') ?? '0'),
      y: parseNumber(pivotEl?.getAttribute('cy') ?? '0'),
    }
    const rotorEl = doc.getElementById(`${base}_rotor_01`)
    const staticLines = [3, 4, 5, 6]
      .map((n) => doc.getElementById(`${base}_static-${n}`))
      .filter((v): v is HTMLElement => v !== null)
      .map((el) => parseLine(el, classMap))
    const staticOutlineEl = doc.getElementById(`${base}_static`)
    const staticInnerEl = doc.getElementById(`${base}_static-2`)
    out[base] = {
      id: base,
      routes: [route1, route2, route3],
      pivot,
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

const svgClassStyleMap = parseClassStyleMap(demoSvgRaw)
const gateGeometries = parseTripodGeometries(demoSvgRaw, svgClassStyleMap)
const personGateGeometries = parsePersonGateGeometries(demoSvgRaw, svgClassStyleMap)
const { wallLines, wallPolylines } = parseWalls(demoSvgRaw, svgClassStyleMap)
const gateRuntimes = ref<Record<string, GateRuntime>>({})
const personGateRuntimes = ref<Record<string, PersonGateRuntime>>({})
const gateIds = computed(() =>
  Object.keys(gateGeometries).filter((id) => Object.prototype.hasOwnProperty.call(props.doorStates, id)),
)
const personGateIds = computed(() =>
  Object.keys(personGateGeometries).filter((id) => Object.prototype.hasOwnProperty.call(props.doorStates, id)),
)

const getEasing = () => (t: number) => t

const ensureRuntime = (gateId: string): GateRuntime => {
  const existing = gateRuntimes.value[gateId]
  if (existing) return existing
  const next: GateRuntime = {
    routeRefs: [null, null, null],
    rotorEndpoints: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    rotorSlots: [3, 2, 1],
    rotorBrightness: [0, 1, 0],
    ready: false,
    rafId: null,
  }
  gateRuntimes.value = { ...gateRuntimes.value, [gateId]: next }
  return next
}

const ensurePersonRuntime = (gateId: string): PersonGateRuntime => {
  const existing = personGateRuntimes.value[gateId]
  if (existing) return existing
  const next: PersonGateRuntime = { angleDeg: 0, rafId: null }
  personGateRuntimes.value = { ...personGateRuntimes.value, [gateId]: next }
  return next
}

const routePointAt = (gateId: string, routeIndex: number, t: number, reverse: boolean): Point => {
  const runtime = ensureRuntime(gateId)
  const path = runtime.routeRefs[routeIndex]
  const fallbackPivot = gateGeometries[gateId]?.pivot ?? { x: 0, y: 0 }
  if (!path) return runtime.rotorEndpoints[routeIndex] ?? fallbackPivot
  const len = path.getTotalLength()
  const progress = reverse ? 1 - t : t
  const p = path.getPointAtLength(len * progress)
  return { x: p.x, y: p.y }
}

// 首次拿到真实 path 引用后，用轨迹端点初始化三个 slot 的起始位置。
const initRuntimeFromPaths = (gateId: string) => {
  const runtime = ensureRuntime(gateId)
  const r0 = runtime.routeRefs[0]
  const r1 = runtime.routeRefs[1]
  if (!r0 || !r1) return
  const r0Len = r0.getTotalLength()
  const r1Len = r1.getTotalLength()
  const slot1 = r0.getPointAtLength(0)
  const slot2 = r0.getPointAtLength(r0Len)
  const slot3 = r1.getPointAtLength(0)
  runtime.rotorSlots = [3, 2, 1]
  runtime.rotorBrightness = [0, 1, 0]
  runtime.rotorEndpoints = [
    { x: slot3.x, y: slot3.y },
    { x: slot2.x, y: slot2.y },
    { x: slot1.x, y: slot1.y },
  ]
  runtime.ready = true
}

const setRouteRef = (gateId: string, idx: number, el: unknown) => {
  const runtime = ensureRuntime(gateId)
  runtime.routeRefs[idx] = el instanceof SVGPathElement ? el : null
  if (!runtime.ready && runtime.routeRefs.every((r) => r !== null)) {
    initRuntimeFromPaths(gateId)
  }
}

const nextSlot = (slot: Slot, flowDirection: DoorFlowDirection): Slot => {
  if (flowDirection === 'out') {
    return (slot === 1 ? 3 : (slot - 1)) as Slot
  }
  return (slot === 3 ? 1 : (slot + 1)) as Slot
}

const brightBySlot = (slot: Slot) => (slot === 2 ? 1 : 0)
const DARK_OPACITY = 0.28
const rotorOpacity = (gateId: string, idx: number) => {
  const b = ensureRuntime(gateId).rotorBrightness[idx] ?? 0
  return DARK_OPACITY + (1 - DARK_OPACITY) * b
}

const resolveTransition = (from: Slot, to: Slot): TransitionSpec => {
  if (from === 2 && to === 1) return { routeIndex: 0, reverse: true }
  if (from === 1 && to === 2) return { routeIndex: 0, reverse: false }
  if (from === 3 && to === 2) return { routeIndex: 1, reverse: false }
  if (from === 2 && to === 3) return { routeIndex: 1, reverse: true }
  if (from === 1 && to === 3) return { routeIndex: 2, reverse: true }
  return { routeIndex: 2, reverse: false } // 3 -> 1
}

const stopAnimation = (gateId: string) => {
  const runtime = ensureRuntime(gateId)
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

const stopPersonAnimation = (gateId: string) => {
  const runtime = ensurePersonRuntime(gateId)
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

const animatePersonGateStep = (gateId: string, flowDirection: DoorFlowDirection) => {
  const runtime = ensurePersonRuntime(gateId)
  stopPersonAnimation(gateId)
  const start = performance.now()
  const amplitude = flowDirection === 'out' ? -90 : 90

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / DURATION_MS)
    // 0~0.5 打开，0.5~1 回位（总计 3 秒）。
    const normalized = raw <= 0.5 ? raw / 0.5 : (1 - raw) / 0.5
    runtime.angleDeg = amplitude * normalized
    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.angleDeg = 0
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}

const animateStep = (gateId: string, flowDirection: DoorFlowDirection) => {
  const runtime = ensureRuntime(gateId)
  if (!runtime.ready) return
  stopAnimation(gateId)
  const start = performance.now()
  const fromSlots = [...runtime.rotorSlots] as Slot[]
  const toSlots = fromSlots.map((slot) => nextSlot(slot, flowDirection)) as Slot[]
  const transitions = fromSlots.map((from, idx) => resolveTransition(from, toSlots[idx] ?? from))
  const fromBrightness = fromSlots.map((slot) => brightBySlot(slot))
  const toBrightness = toSlots.map((slot) => brightBySlot(slot))

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / DURATION_MS)
    runtime.rotorEndpoints = runtime.rotorEndpoints.map((_, idx) => {
      const easing = getEasing()
      const t = easing(raw)
      const transition = transitions[idx]
      if (!transition) return runtime.rotorEndpoints[idx] ?? gateGeometries[gateId]?.pivot ?? { x: 0, y: 0 }
      return routePointAt(gateId, transition.routeIndex, t, transition.reverse)
    })
    runtime.rotorBrightness = runtime.rotorBrightness.map((_, idx) => {
      const from = fromBrightness[idx] ?? 0
      const to = toBrightness[idx] ?? from
      return from + (to - from) * raw
    })

    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.rotorSlots = toSlots
    runtime.rotorBrightness = toBrightness
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}

// 仅在状态翻转时触发对应门动画，避免重复渲染。
watch(
  () => ({ ...props.doorStates }),
  (next, prev) => {
    const prevState = prev ?? {}
    Object.keys(next).forEach((doorId) => {
      if (!doorId.startsWith('gate_tripod_')) return
      if (!Object.prototype.hasOwnProperty.call(gateGeometries, doorId)) return
      if (next[doorId] === prevState[doorId]) return
      const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
      animateStep(doorId, flowDirection)
    })
  },
)

watch(
  () => ({ ...props.doorStates }),
  (next, prev) => {
    const prevState = prev ?? {}
    Object.keys(next).forEach((doorId) => {
      if (!doorId.startsWith('gate_person_')) return
      if (!Object.prototype.hasOwnProperty.call(personGateGeometries, doorId)) return
      if (next[doorId] === prevState[doorId]) return
      const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
      animatePersonGateStep(doorId, flowDirection)
    })
  },
)

onBeforeUnmount(() => {
  Object.keys(gateRuntimes.value).forEach((doorId) => stopAnimation(doorId))
  Object.keys(personGateRuntimes.value).forEach((doorId) => stopPersonAnimation(doorId))
})
</script>

<template>
  <main class="cockpit-scene" aria-label="三辊闸机动画">
    <div id="cockpit-map-mount" class="cockpit-scene__mount">
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
        class="cockpit-scene__svg"
        role="img"
        aria-label="tripod gate demo"
      >
        <polyline
          v-for="(poly, idx) in wallPolylines"
          :key="`wall-poly-${idx}`"
          class="wall"
          :points="poly.points"
          :style="poly.paint"
        />
        <line
          v-for="(line, idx) in wallLines"
          :key="`wall-line-${idx}`"
          class="wall"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          :style="line.paint"
        />
        <g v-for="doorId in gateIds" :key="doorId">
          <path
            :ref="(el) => setRouteRef(doorId, 0, el)"
            class="route route--1"
            :d="gateGeometries[doorId]?.routes[0] ?? ''"
          />
          <path
            :ref="(el) => setRouteRef(doorId, 1, el)"
            class="route route--2"
            :d="gateGeometries[doorId]?.routes[1] ?? ''"
          />
          <path
            :ref="(el) => setRouteRef(doorId, 2, el)"
            class="route route--3"
            :d="gateGeometries[doorId]?.routes[2] ?? ''"
          />

          <line
            class="rotor-line"
            :x1="gateGeometries[doorId]?.pivot.x ?? 0"
            :y1="gateGeometries[doorId]?.pivot.y ?? 0"
            :x2="ensureRuntime(doorId).rotorEndpoints[0]?.x ?? 0"
            :y2="ensureRuntime(doorId).rotorEndpoints[0]?.y ?? 0"
            :style="{ ...gateGeometries[doorId]?.rotorPaint, opacity: rotorOpacity(doorId, 0) }"
          />
          <line
            class="rotor-line"
            :x1="gateGeometries[doorId]?.pivot.x ?? 0"
            :y1="gateGeometries[doorId]?.pivot.y ?? 0"
            :x2="ensureRuntime(doorId).rotorEndpoints[1]?.x ?? 0"
            :y2="ensureRuntime(doorId).rotorEndpoints[1]?.y ?? 0"
            :style="{ ...gateGeometries[doorId]?.rotorPaint, opacity: rotorOpacity(doorId, 1) }"
          />
          <line
            class="rotor-line"
            :x1="gateGeometries[doorId]?.pivot.x ?? 0"
            :y1="gateGeometries[doorId]?.pivot.y ?? 0"
            :x2="ensureRuntime(doorId).rotorEndpoints[2]?.x ?? 0"
            :y2="ensureRuntime(doorId).rotorEndpoints[2]?.y ?? 0"
            :style="{ ...gateGeometries[doorId]?.rotorPaint, opacity: rotorOpacity(doorId, 2) }"
          />

          <circle
            class="pivot"
            :cx="gateGeometries[doorId]?.pivot.x ?? 0"
            :cy="gateGeometries[doorId]?.pivot.y ?? 0"
            :r="gateGeometries[doorId]?.pivotRadius"
            :style="gateGeometries[doorId]?.pivotPaint"
          />
          <rect
            v-if="gateGeometries[doorId]?.staticOutline"
            class="static-outline"
            :x="gateGeometries[doorId]?.staticOutline?.x"
            :y="gateGeometries[doorId]?.staticOutline?.y"
            :width="gateGeometries[doorId]?.staticOutline?.width"
            :height="gateGeometries[doorId]?.staticOutline?.height"
            :style="gateGeometries[doorId]?.staticOutlinePaint"
          />
          <rect
            v-if="gateGeometries[doorId]?.staticInner"
            class="static-inner"
            :x="gateGeometries[doorId]?.staticInner?.x"
            :y="gateGeometries[doorId]?.staticInner?.y"
            :width="gateGeometries[doorId]?.staticInner?.width"
            :height="gateGeometries[doorId]?.staticInner?.height"
            :style="gateGeometries[doorId]?.staticInnerPaint"
          />
          <line
            v-for="(line, lineIdx) in gateGeometries[doorId]?.staticLines ?? []"
            :key="`${doorId}-line-${lineIdx}`"
            class="static-inner"
            :x1="line.x1"
            :y1="line.y1"
            :x2="line.x2"
            :y2="line.y2"
            :style="line.paint"
          />
        </g>
        <g v-for="doorId in personGateIds" :key="doorId">
          <line
            class="person-leaf"
            :x1="personGateGeometries[doorId]?.leaf.x1 ?? 0"
            :y1="personGateGeometries[doorId]?.leaf.y1 ?? 0"
            :x2="personGateGeometries[doorId]?.leaf.x2 ?? 0"
            :y2="personGateGeometries[doorId]?.leaf.y2 ?? 0"
            :transform="`rotate(${ensurePersonRuntime(doorId).angleDeg}, ${personGateGeometries[doorId]?.pivot.x ?? 0}, ${personGateGeometries[doorId]?.pivot.y ?? 0})`"
            :style="personGateGeometries[doorId]?.leaf.paint"
          />
          <circle
            class="person-pivot"
            :cx="personGateGeometries[doorId]?.pivot.x ?? 0"
            :cy="personGateGeometries[doorId]?.pivot.y ?? 0"
            :r="personGateGeometries[doorId]?.pivotRadius"
            :style="personGateGeometries[doorId]?.pivotPaint"
          />
        </g>
      </svg>
    </div>
  </main>
</template>

<style scoped>
.cockpit-scene {
  position: absolute;
  inset: 0;
  z-index: 1;
  min-width: 0;
  background: radial-gradient(ellipse at center, rgba(20, 80, 120, 0.25) 0%, #020810 70%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cockpit-scene__mount {
  width: 100%;
  height: 100%;
}

.cockpit-scene__svg {
  width: 100%;
  height: 100%;
  user-select: none;
}

.route {
  display: none;
}

.rotor-line {
  stroke-linecap: round;
}

.wall {
  stroke-miterlimit: 10;
}

.person-leaf {
  stroke-linecap: round;
}
</style>

