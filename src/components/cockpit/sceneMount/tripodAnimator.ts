// 三辊闸动画模块：管理三根杆的轨迹推进、亮暗状态与动画生命周期。
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
}

// slot 迁移规则：
// out: 1 <- 2 <- 3 <- 1
// in : 1 -> 2 -> 3 -> 1
const nextSlot = (slot: Slot, flowDirection: DoorFlowDirection): Slot => {
  if (flowDirection === 'out') return (slot === 1 ? 3 : slot - 1) as Slot
  return (slot === 3 ? 1 : slot + 1) as Slot
}

// 亮度规则：位于 slot=2 的杆为亮，其余为暗。
const brightBySlot = (slot: Slot) => (slot === 2 ? 1 : 0)

// 从“起点 slot -> 终点 slot”推导该杆应沿哪条轨迹、是否反向取点。
const resolveTransition = (from: Slot, to: Slot): TransitionSpec => {
  if (from === 2 && to === 1) return { routeIndex: 0, reverse: true }
  if (from === 1 && to === 2) return { routeIndex: 0, reverse: false }
  if (from === 3 && to === 2) return { routeIndex: 1, reverse: false }
  if (from === 2 && to === 3) return { routeIndex: 1, reverse: true }
  if (from === 1 && to === 3) return { routeIndex: 2, reverse: true }
  return { routeIndex: 2, reverse: false }
}

// 基于 path 总长和进度 t 取点；reverse=true 时按 1-t 反向行进。
const routePointAt = (runtime: TripodRuntime, geometry: GateGeometry, routeIndex: number, t: number, reverse: boolean): Point => {
  const path = runtime.routeRefs[routeIndex]
  if (!path) return runtime.rotorEndpoints[routeIndex] ?? geometry.pivot
  const len = path.getTotalLength()
  const progress = reverse ? 1 - t : t
  const p = path.getPointAtLength(len * progress)
  return { x: p.x, y: p.y }
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
})

// 首次绑定路径后，根据轨迹端点推导三个 slot 的初始位置。
export const initTripodRuntimeFromPaths = (runtime: TripodRuntime) => {
  const r0 = runtime.routeRefs[0]
  const r1 = runtime.routeRefs[1]
  if (!r0 || !r1) return
  const r0Len = r0.getTotalLength()
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

export const stopTripodAnimation = (runtime: TripodRuntime) => {
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

// 单次 tripod 动画：3秒内同步推进位置与亮度，结束后写回最终 slot。
export const animateTripodStep = (
  runtime: TripodRuntime,
  geometry: GateGeometry,
  flowDirection: DoorFlowDirection,
  durationMs: number,
) => {
  if (!runtime.ready) return
  stopTripodAnimation(runtime)
  const start = performance.now()
  const fromSlots = [...runtime.rotorSlots] as Slot[]
  const toSlots = fromSlots.map((slot) => nextSlot(slot, flowDirection)) as Slot[]
  const transitions = fromSlots.map((from, idx) => resolveTransition(from, toSlots[idx] ?? from))
  const fromBrightness = fromSlots.map((slot) => brightBySlot(slot))
  const toBrightness = toSlots.map((slot) => brightBySlot(slot))

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
    runtime.rotorEndpoints = runtime.rotorEndpoints.map((_, idx) => {
      const transition = transitions[idx]
      if (!transition) return runtime.rotorEndpoints[idx] ?? geometry.pivot
      return routePointAt(runtime, geometry, transition.routeIndex, raw, transition.reverse)
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
