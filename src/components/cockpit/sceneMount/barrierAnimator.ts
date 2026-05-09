// 直杆道闸动画：leaf 以左端为锚点做水平收缩到 pivot 圆周交点，再复原；in/out 共用同一段。
import type { DoorFlowDirection } from '@/types/door'
import type { Point } from './svgParser'

type BBox = { x: number; y: number; width: number; height: number }

export type BarrierRuntime = {
  rafId: number | null
  ready: boolean
  bbox: BBox | null
  leftX: number
  rightX: number
  startScaleX: number
  endScaleX: number
  scaleX: number
}

export const createBarrierRuntime = (): BarrierRuntime => ({
  rafId: null,
  ready: false,
  bbox: null,
  leftX: 0,
  rightX: 0,
  startScaleX: 1,
  endScaleX: 1,
  scaleX: 1,
})

export const stopBarrierAnimation = (runtime: BarrierRuntime) => {
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

const resolveIntersectRightX = (rightMidX: number, rightMidY: number, pivot: Point, pivotRadius: number): number => {
  if (pivotRadius <= 0) return pivot.x
  const dy = rightMidY - pivot.y
  const side = rightMidX >= pivot.x ? 1 : -1
  // 与 y=rightMidY 的水平线求圆交点；若无交点则退化到同侧圆极值点。
  if (Math.abs(dy) > pivotRadius) {
    return pivot.x + side * pivotRadius
  }
  const dx = Math.sqrt(Math.max(0, pivotRadius * pivotRadius - dy * dy))
  const x1 = pivot.x - dx
  const x2 = pivot.x + dx
  return side >= 0 ? Math.max(x1, x2) : Math.min(x1, x2)
}

export const initBarrierRuntimeFromLeaf = (
  runtime: BarrierRuntime,
  leafEl: SVGGraphicsElement,
  pivot: Point,
  pivotRadius: number,
) => {
  const box = leafEl.getBBox()
  if (box.width <= 0 || box.height <= 0) return
  const leftX = box.x
  const rightMidX = box.x + box.width
  const rightMidY = box.y + box.height / 2
  const endX = resolveIntersectRightX(rightMidX, rightMidY, pivot, pivotRadius)
  const minRight = leftX + 0.5
  const rightX = rightMidX
  const targetRightX = Math.min(rightX, Math.max(minRight, endX))
  const span = Math.max(0.5, rightX - leftX)
  const endScale = Math.max(0.001, Math.min(1, (targetRightX - leftX) / span))
  runtime.bbox = { x: box.x, y: box.y, width: box.width, height: box.height }
  runtime.leftX = leftX
  runtime.rightX = rightX
  runtime.startScaleX = 1
  runtime.endScaleX = endScale
  runtime.scaleX = runtime.startScaleX
  runtime.ready = true
}

// in/out 同一段：前半程收缩，后半程复原。
export const animateBarrierStep = (
  runtime: BarrierRuntime,
  _flowDirection: DoorFlowDirection,
  durationMs: number,
) => {
  if (!runtime.ready) return
  stopBarrierAnimation(runtime)
  const start = performance.now()
  const from = runtime.startScaleX
  const to = runtime.endScaleX

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
    const phase = raw <= 0.5 ? raw / 0.5 : (1 - raw) / 0.5
    runtime.scaleX = from + (to - from) * phase
    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.scaleX = from
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}
