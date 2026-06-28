// 三辊闸动画：出/进各一步，杆端沿 route path 弧长采样；每次触发从初始姿态重播，不累积步进。
import type { GateGeometry, Point } from './svgParser'
import type { DoorFlowDirection } from '@/types/door'

export type Slot = 1 | 2 | 3
type TransitionSpec = { routeIndex: number; reverse: boolean }

export type TripodRuntime = {
  routeRefs: Array<SVGPathElement | null>
  rotorEndpoints: Point[]
  rotorSlots: Slot[]
  rotorBrightness: number[]
  ready: boolean
  rafId: number | null
  /** 路径就绪后缓存：初始姿态 + 出/进各一步的 transition 与目标亮度/slot。 */
  playbackCache: TripodPlaybackCache | null
}

type TripodPlaybackCache = {
  fromEndpoints: Point[]
  fromBrightness: number[]
  fromSlots: Slot[]
  outTransitions: TransitionSpec[]
  outToSlots: Slot[]
  outToBrightness: number[]
  inTransitions: TransitionSpec[]
  inToSlots: Slot[]
  inToBrightness: number[]
}

// slot 迁移规则（用于推导一步的 path 走向）：
// out: 1 <- 2 <- 3 <- 1
// in : 1 -> 2 -> 3 -> 1
const nextSlot = (slot: Slot, flowDirection: DoorFlowDirection): Slot => {
  if (flowDirection === 'out') return (slot === 1 ? 3 : slot - 1) as Slot
  return (slot === 3 ? 1 : slot + 1) as Slot
}

const brightBySlot = (slot: Slot) => (slot === 2 ? 1 : 0)

const DARK_OPACITY = 0.28

export const applyTripodRotorDom = (
  runtime: TripodRuntime,
  geometry: GateGeometry,
  rotorEls?: Array<SVGLineElement | null>,
) => {
  if (!rotorEls) return
  rotorEls.forEach((el, idx) => {
    if (!el) return
    const endpoint = runtime.rotorEndpoints[idx] ?? geometry.pivot
    el.setAttribute('x1', String(geometry.pivot.x))
    el.setAttribute('y1', String(geometry.pivot.y))
    el.setAttribute('x2', String(endpoint.x))
    el.setAttribute('y2', String(endpoint.y))
    const brightness = runtime.rotorBrightness[idx] ?? 0
    el.style.opacity = String(DARK_OPACITY + (1 - DARK_OPACITY) * brightness)
  })
}

const resolveTransition = (from: Slot, to: Slot): TransitionSpec => {
  if (from === 2 && to === 1) return { routeIndex: 0, reverse: true }
  if (from === 1 && to === 2) return { routeIndex: 0, reverse: false }
  if (from === 3 && to === 2) return { routeIndex: 1, reverse: false }
  if (from === 2 && to === 3) return { routeIndex: 1, reverse: true }
  if (from === 1 && to === 3) return { routeIndex: 2, reverse: true }
  return { routeIndex: 2, reverse: false }
}

const routePointAt = (
  runtime: TripodRuntime,
  geometry: GateGeometry,
  routeIndex: number,
  t: number,
  reverse: boolean,
): Point => {
  const path = runtime.routeRefs[routeIndex]
  if (!path) return runtime.rotorEndpoints[routeIndex] ?? geometry.pivot
  const len = path.getTotalLength()
  const progress = reverse ? 1 - t : t
  const p = path.getPointAtLength(len * progress)
  return { x: p.x, y: p.y }
}

const buildPlaybackCache = (runtime: TripodRuntime, geometry: GateGeometry) => {
  const fromSlots = [...runtime.rotorSlots] as Slot[]
  const fromEndpoints = runtime.rotorEndpoints.map((p) => ({ ...p }))
  const fromBrightness = [...runtime.rotorBrightness]

  const outToSlots = fromSlots.map((slot) => nextSlot(slot, 'out')) as Slot[]
  const inToSlots = fromSlots.map((slot) => nextSlot(slot, 'in')) as Slot[]
  const outTransitions = fromSlots.map((from, idx) => resolveTransition(from, outToSlots[idx] ?? from))
  const inTransitions = fromSlots.map((from, idx) => resolveTransition(from, inToSlots[idx] ?? from))

  runtime.playbackCache = {
    fromEndpoints,
    fromBrightness,
    fromSlots,
    outTransitions,
    outToSlots,
    outToBrightness: outToSlots.map((s) => brightBySlot(s)),
    inTransitions,
    inToSlots,
    inToBrightness: inToSlots.map((s) => brightBySlot(s)),
  }
}

export const createTripodRuntime = (): TripodRuntime => ({
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
  playbackCache: null,
})

// 首次绑定路径后，根据轨迹端点推导初始杆位；清空重播缓存以便下次动画重建。
export const initTripodRuntimeFromPaths = (runtime: TripodRuntime) => {
  const r0 = runtime.routeRefs[0]
  const r1 = runtime.routeRefs[1]
  const r2 = runtime.routeRefs[2]
  if (!r0 || !r1 || !r2) return
  const r0Len = r0.getTotalLength()
  const r1Len = r1.getTotalLength()
  if (r0Len <= 0 || r1Len <= 0) return
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
  runtime.playbackCache = null
}

export const stopTripodAnimation = (runtime: TripodRuntime) => {
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

// 每次触发：回到缓存的初始姿态，再沿 path 弧长走完整一步；亮度仍线性插值。
export const animateTripodStep = (
  runtime: TripodRuntime,
  geometry: GateGeometry,
  flowDirection: DoorFlowDirection,
  durationMs: number,
  rotorEls?: Array<SVGLineElement | null>,
) => {
  if (!runtime.ready) return
  stopTripodAnimation(runtime)
  if (!runtime.playbackCache) {
    buildPlaybackCache(runtime, geometry)
  }
  const cache = runtime.playbackCache
  if (!cache) return

  const transitions = flowDirection === 'out' ? cache.outTransitions : cache.inTransitions
  const toBrightness = flowDirection === 'out' ? cache.outToBrightness : cache.inToBrightness
  const toSlots = flowDirection === 'out' ? cache.outToSlots : cache.inToSlots

  const fromB = cache.fromBrightness
  runtime.rotorSlots = [...cache.fromSlots]
  runtime.rotorEndpoints = cache.fromEndpoints.map((p) => ({ ...p }))
  runtime.rotorBrightness = [...fromB]
  applyTripodRotorDom(runtime, geometry, rotorEls)

  const start = performance.now()
  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
    runtime.rotorEndpoints = transitions.map((tr, idx) => {
      if (!tr) return runtime.rotorEndpoints[idx] ?? geometry.pivot
      return routePointAt(runtime, geometry, tr.routeIndex, raw, tr.reverse)
    })
    runtime.rotorBrightness = fromB.map((b, idx) => {
      const tb = toBrightness[idx] ?? b
      return b + (tb - b) * raw
    })
    applyTripodRotorDom(runtime, geometry, rotorEls)
    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.rotorEndpoints = transitions.map((tr, idx) => {
      if (!tr) return runtime.rotorEndpoints[idx] ?? geometry.pivot
      return routePointAt(runtime, geometry, tr.routeIndex, 1, tr.reverse)
    })
    runtime.rotorBrightness = [...toBrightness]
    runtime.rotorSlots = [...toSlots]
    applyTripodRotorDom(runtime, geometry, rotorEls)
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}
