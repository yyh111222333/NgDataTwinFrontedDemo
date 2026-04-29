// 人员门动画模块：处理 out/in 摆门角度与回位动画。
import type { DoorFlowDirection } from '@/types/door'

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

// 人员门动画：总时长 3 秒，前半程开门，后半程回位。
// out: 逆时针（-90°）再回 0°；in: 顺时针（+90°）再回 0°。
export const animatePersonStep = (runtime: PersonRuntime, flowDirection: DoorFlowDirection, durationMs: number) => {
  stopPersonAnimation(runtime)
  const start = performance.now()
  const amplitude = flowDirection === 'out' ? -90 : 90

  const step = (now: number) => {
    const raw = Math.min(1, (now - start) / durationMs)
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
