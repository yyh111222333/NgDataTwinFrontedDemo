// 全高闸动画：进 in 顺时针 +90°、出 out 逆时针 -90°；每次触发从 0° 重播一段，不累积角度。
import type { DoorFlowDirection } from '@/types/door'
import type { Point } from './svgParser'

export type FullheightRuntime = {
  angleDeg: number
  rafId: number | null
}

export const createFullheightRuntime = (): FullheightRuntime => ({
  angleDeg: 0,
  rafId: null,
})

export const stopFullheightAnimation = (runtime: FullheightRuntime) => {
  if (runtime.rafId !== null) {
    cancelAnimationFrame(runtime.rafId)
    runtime.rafId = null
  }
}

const applyFullheightLeafTransform = (
  runtime: FullheightRuntime,
  pivot: Point,
  leafEl?: SVGGraphicsElement | null,
) => {
  if (!leafEl) return
  leafEl.setAttribute('transform', `rotate(${runtime.angleDeg} ${pivot.x} ${pivot.y})`)
}

export const resetFullheightLeafTransform = (
  runtime: FullheightRuntime,
  pivot: Point,
  leafEl?: SVGGraphicsElement | null,
) => {
  runtime.angleDeg = 0
  applyFullheightLeafTransform(runtime, pivot, leafEl)
}

// 每次触发：角度回到 0°，再按 durationMs 线性插值到 in:+90° 或 out:-90°；可反复重播同一段。
export const animateFullheightStep = (
  runtime: FullheightRuntime,
  flowDirection: DoorFlowDirection,
  durationMs: number,
  pivot: Point,
  leafEl?: SVGGraphicsElement | null,
  open = true,
) => {
  stopFullheightAnimation(runtime)
  const fromAngle = runtime.angleDeg
  const toAngle = open ? (flowDirection === 'in' ? 90 : -90) : 0
  const start = performance.now()

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
    runtime.angleDeg = fromAngle + (toAngle - fromAngle) * raw
    applyFullheightLeafTransform(runtime, pivot, leafEl)
    if (raw < 1) {
      runtime.rafId = requestAnimationFrame(step)
      return
    }
    runtime.angleDeg = toAngle
    applyFullheightLeafTransform(runtime, pivot, leafEl)
    runtime.rafId = null
  }

  runtime.rafId = requestAnimationFrame(step)
}
