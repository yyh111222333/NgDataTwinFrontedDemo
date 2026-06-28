// 人员门动画：前半程摆开，后半程回位；out 逆时针 -45°，in 顺时针 +45°。
import type { DoorFlowDirection } from '@/types/door'
import type { Line, Point } from './svgParser'

export type PersonRuntime = {
  angleDeg: number
  rafId: number | null
}

export const createPersonRuntime = (): PersonRuntime => ({
  angleDeg: 0,
  rafId: null,
})

export const stopPersonAnimation = (runtime: PersonRuntime) => {
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

/** 按 leaf 相对 pivot 的朝向修正摆角符号，避免批量触发时不同朝向的门看起来同向。 */
export const resolvePersonSwingMultiplier = (leaf: Line, pivot: Point): number => {
  const near1 = Math.hypot(leaf.x1 - pivot.x, leaf.y1 - pivot.y)
  const near2 = Math.hypot(leaf.x2 - pivot.x, leaf.y2 - pivot.y)
  const fx = near1 <= near2 ? leaf.x2 : leaf.x1
  const fy = near1 <= near2 ? leaf.y2 : leaf.y1
  const vx = fx - pivot.x
  const vy = fy - pivot.y
  if (Math.abs(vx) >= Math.abs(vy)) {
    return vx >= 0 ? 1 : -1
  }
  return vy >= 0 ? 1 : -1
}

export const resolvePersonSwingAmplitude = (
  leaf: Line,
  pivot: Point,
  flowDirection: DoorFlowDirection,
): number => {
  const base = flowDirection === 'out' ? -45 : 45
  return base * resolvePersonSwingMultiplier(leaf, pivot)
}

const applyPersonLeafTransform = (
  runtime: PersonRuntime,
  pivot: Point,
  leafEl?: SVGGraphicsElement | null,
) => {
  if (!leafEl) return
  leafEl.setAttribute('transform', `rotate(${runtime.angleDeg} ${pivot.x} ${pivot.y})`)
}

export const resetPersonLeafTransform = (
  runtime: PersonRuntime,
  pivot: Point,
  leafEl?: SVGGraphicsElement | null,
) => {
  runtime.angleDeg = 0
  applyPersonLeafTransform(runtime, pivot, leafEl)
}

export const animatePersonStep = (
  runtime: PersonRuntime,
  flowDirection: DoorFlowDirection,
  durationMs: number,
  pivot: Point,
  leaf: Line,
  leafEl?: SVGGraphicsElement | null,
  open = true,
) => {
  stopPersonAnimation(runtime)
  const start = performance.now()
  const fromAngle = runtime.angleDeg
  const toAngle = open ? resolvePersonSwingAmplitude(leaf, pivot, flowDirection) : 0

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
    runtime.angleDeg = fromAngle + (toAngle - fromAngle) * raw
    applyPersonLeafTransform(runtime, pivot, leafEl)
    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.angleDeg = toAngle
    applyPersonLeafTransform(runtime, pivot, leafEl)
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}
