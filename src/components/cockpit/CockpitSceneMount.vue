<!-- 场景挂载组件：渲染 SVG 厂区并分发各类门禁动画。 -->
<script setup lang="ts">
import demoSvgRaw from '@/assets/demo.svg?raw'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  animateTripodStep,
  createTripodRuntime,
  initTripodRuntimeFromPaths,
  stopTripodAnimation,
  type TripodRuntime,
} from './sceneMount/tripodAnimator'
import {
  animatePersonStep,
  createPersonRuntime,
  stopPersonAnimation,
  type PersonRuntime,
} from './sceneMount/personAnimator'
import { parseSceneGeometry } from './sceneMount/svgParser'
import type { DoorFlowDirection } from '@/types/door'

// SceneMount 编排层：
// 1) 解析 SVG 为可渲染几何
// 2) 维护每扇门的运行态 runtime
// 3) 监听 doorStates 变化并分发到对应动画器
const props = defineProps<{
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
}>()

const DURATION_MS = 3000
const DARK_OPACITY = 0.28

// 仅在 setup 阶段解析一次静态几何，运行时只改 runtime。
const { gateGeometries, personGateGeometries, wallLines, wallPolylines } = parseSceneGeometry(demoSvgRaw)
const gateRuntimes = ref<Record<string, TripodRuntime>>({})
const personGateRuntimes = ref<Record<string, PersonRuntime>>({})

const gateIds = computed(() =>
  Object.keys(gateGeometries).filter((id) => Object.prototype.hasOwnProperty.call(props.doorStates, id)),
)
const personGateIds = computed(() =>
  Object.keys(personGateGeometries).filter((id) => Object.prototype.hasOwnProperty.call(props.doorStates, id)),
)

// 延迟初始化：仅当某门实际渲染/触发时才创建 runtime。
const ensureRuntime = (gateId: string): TripodRuntime => {
  const existing = gateRuntimes.value[gateId]
  if (existing) return existing
  const next = createTripodRuntime()
  gateRuntimes.value = { ...gateRuntimes.value, [gateId]: next }
  return next
}

const ensurePersonRuntime = (gateId: string): PersonRuntime => {
  const existing = personGateRuntimes.value[gateId]
  if (existing) return existing
  const next = createPersonRuntime()
  personGateRuntimes.value = { ...personGateRuntimes.value, [gateId]: next }
  return next
}

const gateRuntimeMap = computed<Record<string, TripodRuntime>>(() =>
  Object.fromEntries(gateIds.value.map((doorId) => [doorId, ensureRuntime(doorId)])),
)

const personRuntimeMap = computed<Record<string, PersonRuntime>>(() =>
  Object.fromEntries(personGateIds.value.map((doorId) => [doorId, ensurePersonRuntime(doorId)])),
)

const setRouteRef = (gateId: string, idx: number, el: unknown) => {
  const runtime = ensureRuntime(gateId)
  runtime.routeRefs[idx] = el instanceof SVGPathElement ? el : null
  if (!runtime.ready && runtime.routeRefs.every((r) => r !== null)) {
    initTripodRuntimeFromPaths(runtime)
  }
}

// 将 0~1 亮度映射到可见透明度，避免“暗态完全消失”。
const rotorOpacity = (gateId: string, idx: number) => {
  const b = ensureRuntime(gateId).rotorBrightness[idx] ?? 0
  return DARK_OPACITY + (1 - DARK_OPACITY) * b
}

// 门状态翻转时触发动画：
// - gate_tripod_* -> tripodAnimator
// - gate_person_* -> personAnimator
watch(
  () => ({ ...props.doorStates }),
  (next, prev) => {
    const prevState = prev ?? {}
    Object.keys(next).forEach((doorId) => {
      if (next[doorId] === prevState[doorId]) return
      const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
      if (Object.prototype.hasOwnProperty.call(gateGeometries, doorId)) {
        const geometry = gateGeometries[doorId]
        if (!geometry) return
        const runtime = ensureRuntime(doorId)
        animateTripodStep(runtime, geometry, flowDirection, DURATION_MS)
        return
      }
      if (Object.prototype.hasOwnProperty.call(personGateGeometries, doorId)) {
        const runtime = ensurePersonRuntime(doorId)
        animatePersonStep(runtime, flowDirection, DURATION_MS)
      }
    })
  },
)

onBeforeUnmount(() => {
  Object.keys(gateRuntimes.value).forEach((doorId) => stopTripodAnimation(ensureRuntime(doorId)))
  Object.keys(personGateRuntimes.value).forEach((doorId) => stopPersonAnimation(ensurePersonRuntime(doorId)))
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
            :x2="gateRuntimeMap[doorId]?.rotorEndpoints[0]?.x ?? 0"
            :y2="gateRuntimeMap[doorId]?.rotorEndpoints[0]?.y ?? 0"
            :style="{ ...gateGeometries[doorId]?.rotorPaint, opacity: rotorOpacity(doorId, 0) }"
          />
          <line
            class="rotor-line"
            :x1="gateGeometries[doorId]?.pivot.x ?? 0"
            :y1="gateGeometries[doorId]?.pivot.y ?? 0"
            :x2="gateRuntimeMap[doorId]?.rotorEndpoints[1]?.x ?? 0"
            :y2="gateRuntimeMap[doorId]?.rotorEndpoints[1]?.y ?? 0"
            :style="{ ...gateGeometries[doorId]?.rotorPaint, opacity: rotorOpacity(doorId, 1) }"
          />
          <line
            class="rotor-line"
            :x1="gateGeometries[doorId]?.pivot.x ?? 0"
            :y1="gateGeometries[doorId]?.pivot.y ?? 0"
            :x2="gateRuntimeMap[doorId]?.rotorEndpoints[2]?.x ?? 0"
            :y2="gateRuntimeMap[doorId]?.rotorEndpoints[2]?.y ?? 0"
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
            :transform="`rotate(${personRuntimeMap[doorId]?.angleDeg ?? 0}, ${personGateGeometries[doorId]?.pivot.x ?? 0}, ${personGateGeometries[doorId]?.pivot.y ?? 0})`"
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

