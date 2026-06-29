<!-- 场景挂载：原样展示 SVG 样式，并对各类门禁做动画。 -->
<script setup lang="ts">
import plantMapSvgRaw from '@/assets/厂区地图_画板 1.svg?raw'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  animateBarrierStep,
  createBarrierRuntime,
  initBarrierRuntimeFromLeaf,
  stopBarrierAnimation,
  type BarrierRuntime,
} from './sceneMount/barrierAnimator'
import {
  animateFullheightStep,
  createFullheightRuntime,
  resetFullheightLeafTransform,
  stopFullheightAnimation,
  type FullheightRuntime,
} from './sceneMount/fullheightAnimator'
import {
  animatePersonStep,
  createPersonRuntime,
  resetPersonLeafTransform,
  stopPersonAnimation,
  type PersonRuntime,
} from './sceneMount/personAnimator'
import { queryGateLeaf } from './sceneMount/gateParts'
import { parseSceneGeometry } from './sceneMount/svgParser'
import {
  animateTripodStep,
  applyTripodRotorDom,
  createTripodRuntime,
  initTripodRuntimeFromPaths,
  stopTripodAnimation,
  type TripodRuntime,
} from './sceneMount/tripodAnimator'
import { queryTripodPivot, queryTripodRoute, queryTripodRotor } from './sceneMount/tripodParts'
import type { DoorFlowDirection } from '@/types/door'

const props = defineProps<{
  doorStates: Record<string, boolean>
  doorFlowDirections: Record<string, DoorFlowDirection>
}>()

const DOOR_DURATION_MS = 1500
const mountRef = ref<HTMLElement | null>(null)
const plantMapSvgHtml = computed(() => plantMapSvgRaw.replace(/^\s*<\?xml[^>]*\?>\s*/i, '').trim())

const {
  barrierGateGeometries,
  fullheightGateGeometries,
  personGateGeometries,
  gateGeometries: tripodGateGeometries,
} = parseSceneGeometry(plantMapSvgRaw)
const barrierGateRuntimes = ref<Record<string, BarrierRuntime>>({})
const fullheightGateRuntimes = ref<Record<string, FullheightRuntime>>({})
const personGateRuntimes = ref<Record<string, PersonRuntime>>({})
const tripodGateRuntimes = ref<Record<string, TripodRuntime>>({})
const barrierLeafElements: Record<string, SVGGraphicsElement> = {}
const fullheightLeafElements: Record<string, SVGGraphicsElement> = {}
const personLeafElements: Record<string, SVGGraphicsElement> = {}
const tripodRotorElements: Record<string, Array<SVGLineElement | null>> = {}
const boundGateCount = ref(0)

const isBarrierGate = (gateId: string) =>
  Object.prototype.hasOwnProperty.call(barrierGateGeometries, gateId)
const isFullheightGate = (gateId: string) =>
  Object.prototype.hasOwnProperty.call(fullheightGateGeometries, gateId)
const isPersonGate = (gateId: string) =>
  Object.prototype.hasOwnProperty.call(personGateGeometries, gateId)
const isTripodGate = (gateId: string) =>
  Object.prototype.hasOwnProperty.call(tripodGateGeometries, gateId)

const ensureBarrierRuntime = (gateId: string): BarrierRuntime => {
  const existing = barrierGateRuntimes.value[gateId]
  if (existing) return existing
  const next = createBarrierRuntime()
  barrierGateRuntimes.value = { ...barrierGateRuntimes.value, [gateId]: next }
  return next
}

const ensureFullheightRuntime = (gateId: string): FullheightRuntime => {
  const existing = fullheightGateRuntimes.value[gateId]
  if (existing) return existing
  const next = createFullheightRuntime()
  fullheightGateRuntimes.value = { ...fullheightGateRuntimes.value, [gateId]: next }
  return next
}

const ensurePersonRuntime = (gateId: string): PersonRuntime => {
  const existing = personGateRuntimes.value[gateId]
  if (existing) return existing
  const next = createPersonRuntime()
  personGateRuntimes.value = { ...personGateRuntimes.value, [gateId]: next }
  return next
}

const ensureTripodRuntime = (gateId: string): TripodRuntime => {
  const existing = tripodGateRuntimes.value[gateId]
  if (existing) return existing
  const next = createTripodRuntime()
  tripodGateRuntimes.value = { ...tripodGateRuntimes.value, [gateId]: next }
  return next
}

const bindOneBarrier = (gateId: string, group: Element): boolean => {
  const geometry = barrierGateGeometries[gateId]
  if (!geometry) return false

  const leaf = queryGateLeaf(group)
  if (!leaf) return false

  barrierLeafElements[gateId] = leaf
  const runtime = ensureBarrierRuntime(gateId)
  if (!runtime.ready) {
    initBarrierRuntimeFromLeaf(runtime, leaf, geometry.pivot, geometry.pivotRadius)
  }
  return runtime.ready
}

const bindOneFullheight = (gateId: string, group: Element): boolean => {
  const geometry = fullheightGateGeometries[gateId]
  if (!geometry) return false

  const leaf = queryGateLeaf(group)
  if (!leaf) return false

  fullheightLeafElements[gateId] = leaf
  const runtime = ensureFullheightRuntime(gateId)
  resetFullheightLeafTransform(runtime, geometry.pivot, leaf)
  return true
}

const bindOnePerson = (gateId: string, group: Element): boolean => {
  const geometry = personGateGeometries[gateId]
  if (!geometry) return false

  const leaf = queryGateLeaf(group)
  if (!leaf) return false

  personLeafElements[gateId] = leaf
  const runtime = ensurePersonRuntime(gateId)
  resetPersonLeafTransform(runtime, geometry.pivot, leaf)
  return true
}

const findGateGroup = (svg: Element, gateId: string): Element | null =>
  svg.querySelector(`#${CSS.escape(gateId)}`) ?? svg.ownerDocument.getElementById(gateId)

const bindOneTripod = (gateId: string, group: Element): boolean => {
  const geometry = tripodGateGeometries[gateId]
  if (!geometry) return false

  const route1 = queryTripodRoute(group, 1)
  const route2 = queryTripodRoute(group, 2)
  const route3 = queryTripodRoute(group, 3)
  const rotor1 = queryTripodRotor(group, 1)
  const rotor2 = queryTripodRotor(group, 2)
  const rotor3 = queryTripodRotor(group, 3)
  const pivot = queryTripodPivot(group)
  if (!route1 || !route2 || !route3 || !rotor1 || !rotor2 || !rotor3 || !pivot) {
    delete tripodRotorElements[gateId]
    return false
  }

  const runtime = ensureTripodRuntime(gateId)
  stopTripodAnimation(runtime)
  runtime.routeRefs = [route1, route2, route3]
  runtime.playbackCache = null
  runtime.ready = false
  tripodRotorElements[gateId] = [rotor1, rotor2, rotor3]

  initTripodRuntimeFromPaths(runtime)
  if (!runtime.ready) {
    delete tripodRotorElements[gateId]
    return false
  }
  applyTripodRotorDom(runtime, geometry, tripodRotorElements[gateId])
  return true
}

const bindAnimatedGates = () => {
  const root = mountRef.value
  const svg = root?.querySelector('svg')
  if (!svg) return

  let bound = 0
  Object.keys(props.doorStates).forEach((gateId) => {
    const group = findGateGroup(svg, gateId)
    if (!group) return
    if (isBarrierGate(gateId) && bindOneBarrier(gateId, group)) bound += 1
    if (isFullheightGate(gateId) && bindOneFullheight(gateId, group)) bound += 1
    if (isPersonGate(gateId) && bindOnePerson(gateId, group)) bound += 1
    if (isTripodGate(gateId) && bindOneTripod(gateId, group)) bound += 1
  })
  boundGateCount.value = bound
  Object.entries(props.doorStates).forEach(([gateId, open]) => {
    if (!open) return
    triggerDoorAnimation(gateId, true)
  })
}

const triggerBarrierAnimation = (doorId: string, open: boolean) => {
  const root = mountRef.value
  const svg = root?.querySelector('svg')
  const group = svg?.querySelector(`#${CSS.escape(doorId)}`)
  if (group && !barrierLeafElements[doorId]) {
    bindOneBarrier(doorId, group)
  }

  const geometry = barrierGateGeometries[doorId]
  if (!geometry) return
  const runtime = ensureBarrierRuntime(doorId)
  const leafEl = barrierLeafElements[doorId]
  if (!runtime.ready && leafEl) {
    initBarrierRuntimeFromLeaf(runtime, leafEl, geometry.pivot, geometry.pivotRadius)
  }
  if (!runtime.ready || !leafEl) return
  const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
  animateBarrierStep(runtime, flowDirection, DOOR_DURATION_MS, leafEl, open)
}

const triggerFullheightAnimation = (doorId: string, open: boolean) => {
  const root = mountRef.value
  const svg = root?.querySelector('svg')
  const group = svg?.querySelector(`#${CSS.escape(doorId)}`)
  if (group && !fullheightLeafElements[doorId]) {
    bindOneFullheight(doorId, group)
  }

  const geometry = fullheightGateGeometries[doorId]
  if (!geometry) return
  const leafEl = fullheightLeafElements[doorId]
  if (!leafEl) return
  const runtime = ensureFullheightRuntime(doorId)
  const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
  animateFullheightStep(runtime, flowDirection, DOOR_DURATION_MS, geometry.pivot, leafEl, open)
}

const triggerPersonAnimation = (doorId: string, open: boolean) => {
  const root = mountRef.value
  const svg = root?.querySelector('svg')
  const group = svg?.querySelector(`#${CSS.escape(doorId)}`)
  if (group && !personLeafElements[doorId]) {
    bindOnePerson(doorId, group)
  }

  const geometry = personGateGeometries[doorId]
  if (!geometry) return
  const leafEl = personLeafElements[doorId]
  if (!leafEl) return
  const runtime = ensurePersonRuntime(doorId)
  const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
  animatePersonStep(runtime, flowDirection, DOOR_DURATION_MS, geometry.pivot, geometry.leaf, leafEl, open)
}

const triggerTripodAnimation = (doorId: string) => {
  const root = mountRef.value
  const svg = root?.querySelector('svg')
  const group = svg ? findGateGroup(svg, doorId) : null
  if (!group) return

  if (!tripodRotorElements[doorId] || !ensureTripodRuntime(doorId).ready) {
    bindOneTripod(doorId, group)
  }

  const geometry = tripodGateGeometries[doorId]
  if (!geometry) return
  const runtime = ensureTripodRuntime(doorId)
  if (!runtime.ready) return
  const flowDirection = props.doorFlowDirections[doorId] ?? 'out'
  animateTripodStep(runtime, geometry, flowDirection, DOOR_DURATION_MS, tripodRotorElements[doorId])
}

const triggerDoorAnimation = (doorId: string, open: boolean) => {
  if (isBarrierGate(doorId)) {
    triggerBarrierAnimation(doorId, open)
    return
  }
  if (isFullheightGate(doorId)) {
    triggerFullheightAnimation(doorId, open)
    return
  }
  if (isPersonGate(doorId)) {
    triggerPersonAnimation(doorId, open)
    return
  }
  if (isTripodGate(doorId)) {
    triggerTripodAnimation(doorId)
  }
}

watch(
  () => props.doorStates,
  (next, prev) => {
    if (!prev) return
    Object.keys(next).forEach((doorId) => {
      if (next[doorId] === prev[doorId]) return
      if (!isBarrierGate(doorId) && !isFullheightGate(doorId) && !isPersonGate(doorId) && !isTripodGate(doorId)) {
        return
      }
      triggerDoorAnimation(doorId, next[doorId] === true)
    })
  },
  { deep: true },
)

watch(
  () => plantMapSvgHtml.value,
  () => {
    void nextTick(() => requestAnimationFrame(bindAnimatedGates))
  },
)

onMounted(() => {
  void nextTick(() => requestAnimationFrame(bindAnimatedGates))
})

onBeforeUnmount(() => {
  Object.keys(barrierGateRuntimes.value).forEach((doorId) =>
    stopBarrierAnimation(ensureBarrierRuntime(doorId)),
  )
  Object.keys(fullheightGateRuntimes.value).forEach((doorId) =>
    stopFullheightAnimation(ensureFullheightRuntime(doorId)),
  )
  Object.keys(personGateRuntimes.value).forEach((doorId) =>
    stopPersonAnimation(ensurePersonRuntime(doorId)),
  )
  Object.keys(tripodGateRuntimes.value).forEach((doorId) =>
    stopTripodAnimation(ensureTripodRuntime(doorId)),
  )
})

defineExpose({ boundGateCount })
</script>

<template>
  <main class="cockpit-scene" aria-label="厂区地图">
    <div
      id="cockpit-map-mount"
      ref="mountRef"
      class="cockpit-scene__mount cockpit-scene__mount--raw"
      v-html="plantMapSvgHtml"
    />
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

.cockpit-scene__mount--raw :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
}
</style>
