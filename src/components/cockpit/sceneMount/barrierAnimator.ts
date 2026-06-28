// 直杆道闸动画：以 pivot 铰链侧为锚点水平收缩，再复原。
import type { DoorFlowDirection } from '@/types/door'
import type { Point } from './svgParser'

type BBox = { x: number; y: number; width: number; height: number }

export type BarrierRuntime = {
  rafId: number | null
  ready: boolean
  bbox: BBox | null
  /** 水平缩放锚点（靠近 pivot 一侧） */
  anchorX: number
  startScaleX: number
  endScaleX: number
  scaleX: number
}

export const createBarrierRuntime = (): BarrierRuntime => ({
  rafId: null,
  ready: false,
  bbox: null,
  anchorX: 0,
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

const resolveIntersectX = (
  fromX: number,
  fromY: number,
  pivot: Point,
  pivotRadius: number,
): number => {
  if (pivotRadius <= 0) return pivot.x
  const dy = fromY - pivot.y
  const towardPivot = fromX >= pivot.x ? -1 : 1
  if (Math.abs(dy) > pivotRadius) {
    return pivot.x + towardPivot * pivotRadius
  }
  const dx = Math.sqrt(Math.max(0, pivotRadius * pivotRadius - dy * dy))
  const x1 = pivot.x - dx
  const x2 = pivot.x + dx
  return towardPivot < 0 ? Math.min(x1, x2) : Math.max(x1, x2)
}

const applyBarrierLeafTransform = (runtime: BarrierRuntime, leafEl?: SVGGraphicsElement | null) => {
  if (!leafEl || !runtime.ready) return
  const x = runtime.anchorX
  const sx = runtime.scaleX
  leafEl.setAttribute('transform', `translate(${x} 0) scale(${sx} 1) translate(${-x} 0)`)
}

export const initBarrierRuntimeFromLeaf = (
  runtime: BarrierRuntime,
  leafEl: SVGGraphicsElement,
  pivot: Point,
  pivotRadius: number,
) => {
  const box = leafEl.getBBox()
  if (box.width <= 0 || box.height <= 0) return

  const left = box.x
  const right = box.x + box.width
  const midY = box.y + box.height / 2
  const hingeOnLeft = Math.abs(pivot.x - left) <= Math.abs(pivot.x - right)
  const anchorX = hingeOnLeft ? left : right
  const farX = hingeOnLeft ? right : left
  const fullSpan = Math.max(0.5, Math.abs(farX - anchorX))
  const targetFarX = resolveIntersectX(farX, midY, pivot, pivotRadius)
  const collapsedSpan = Math.max(0.5, Math.abs(targetFarX - anchorX))
  const endScale = Math.max(0.001, Math.min(1, collapsedSpan / fullSpan))

  runtime.bbox = { x: box.x, y: box.y, width: box.width, height: box.height }
  runtime.anchorX = anchorX
  runtime.startScaleX = 1
  runtime.endScaleX = endScale
  runtime.scaleX = 1
  runtime.ready = true
  applyBarrierLeafTransform(runtime, leafEl)
}

export const animateBarrierStep = (
  runtime: BarrierRuntime,
  _flowDirection: DoorFlowDirection,
  durationMs: number,
  leafEl?: SVGGraphicsElement | null,
  open = true,
) => {
  if (!runtime.ready) return
  stopBarrierAnimation(runtime)
  const start = performance.now()
  const from = runtime.scaleX
  const to = open ? runtime.endScaleX : runtime.startScaleX

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
    runtime.scaleX = from + (to - from) * raw
    applyBarrierLeafTransform(runtime, leafEl)
    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.scaleX = to
    applyBarrierLeafTransform(runtime, leafEl)
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}
