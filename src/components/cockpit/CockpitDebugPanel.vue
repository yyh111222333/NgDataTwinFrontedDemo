<!-- 门禁动画测试面板（F8）：道闸 + 人脸门禁（全高闸） -->
<script setup lang="ts">
import { groupSceneDoorLabel } from '@/components/cockpit/sceneMount/sceneDoorIds'
import type { DoorFlowDirection } from '@/types/door'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  visible: boolean
  doorIds: string[]
  selectedDoorId: string
  selectedDoorOpen: boolean
  selectedDoorFlowDirection: DoorFlowDirection
  animationReadyCount: number
}>()

const emit = defineEmits<{
  (e: 'update:selectedDoorId', value: string): void
  (e: 'triggerAnimation'): void
  (e: 'toggleFlowDirection'): void
  (e: 'openAll'): void
}>()

const panelRef = ref<HTMLElement | null>(null)
const panelLeft = ref(0)
const panelTop = ref(96)
const isDragging = ref(false)
let dragOffsetX = 0
let dragOffsetY = 0

const vehicleDoors = computed(() => props.doorIds.filter((id) => id.startsWith('vehicleBarrier_')))
const trainDoors = computed(() => props.doorIds.filter((id) => id.startsWith('trainBarrier_')))
const fullheightDoors = computed(() => props.doorIds.filter((id) => id.startsWith('fullheight_')))
const tripodDoors = computed(() => props.doorIds.filter((id) => id.startsWith('tripod_')))
const personDoors = computed(() => props.doorIds.filter((id) => id.startsWith('person_')))
const selectedDoorLabel = computed(() => groupSceneDoorLabel(props.selectedDoorId))

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val))

const getDragContext = () => {
  const panelEl = panelRef.value
  if (!panelEl) return null
  const parentEl = panelEl.offsetParent as HTMLElement | null
  if (!parentEl) return null
  const parentRect = parentEl.getBoundingClientRect()
  const scaleX = parentRect.width / parentEl.offsetWidth || 1
  const scaleY = parentRect.height / parentEl.offsetHeight || 1
  return { panelEl, parentEl, parentRect, scaleX, scaleY }
}

const placePanelToDefault = () => {
  const panelWidth = panelRef.value?.offsetWidth ?? 300
  const parentWidth = (panelRef.value?.offsetParent as HTMLElement | null)?.offsetWidth ?? window.innerWidth
  panelLeft.value = Math.max(0, parentWidth - panelWidth - 20)
  panelTop.value = 96
}

const onDragMove = (event: MouseEvent) => {
  if (!isDragging.value) return
  const ctx = getDragContext()
  if (!ctx) return
  const panelWidth = ctx.panelEl.offsetWidth
  const panelHeight = ctx.panelEl.offsetHeight
  const localX = (event.clientX - ctx.parentRect.left) / ctx.scaleX
  const localY = (event.clientY - ctx.parentRect.top) / ctx.scaleY
  const maxLeft = Math.max(0, ctx.parentEl.offsetWidth - panelWidth)
  const maxTop = Math.max(0, ctx.parentEl.offsetHeight - panelHeight)
  panelLeft.value = clamp(localX - dragOffsetX, 0, maxLeft)
  panelTop.value = clamp(localY - dragOffsetY, 0, maxTop)
}

const stopDrag = () => {
  isDragging.value = false
}

const startDrag = (event: MouseEvent) => {
  const ctx = getDragContext()
  if (!ctx) return
  isDragging.value = true
  const localX = (event.clientX - ctx.parentRect.left) / ctx.scaleX
  const localY = (event.clientY - ctx.parentRect.top) / ctx.scaleY
  dragOffsetX = localX - panelLeft.value
  dragOffsetY = localY - panelTop.value
}

const onResize = () => {
  const ctx = getDragContext()
  if (!ctx) return
  const panelWidth = ctx.panelEl.offsetWidth
  const panelHeight = ctx.panelEl.offsetHeight
  panelLeft.value = clamp(panelLeft.value, 0, Math.max(0, ctx.parentEl.offsetWidth - panelWidth))
  panelTop.value = clamp(panelTop.value, 0, Math.max(0, ctx.parentEl.offsetHeight - panelHeight))
}

onMounted(() => {
  placePanelToDefault()
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <aside
    v-if="visible"
    ref="panelRef"
    class="scene-debug-panel"
    :style="{ left: `${panelLeft}px`, top: `${panelTop}px` }"
  >
    <div class="scene-debug-panel__title scene-debug-panel__title--drag" @mousedown.prevent="startDrag">
      门禁动画测试（F8）
    </div>

    <p class="scene-debug-panel__hint">
      地图样式来自 SVG 原文件。连锁管控门为摆门动画；道闸为收缩；人脸门禁为旋转；火车道管控门为三辊闸轨迹。
    </p>

    <p class="scene-debug-panel__meta">
      已绑定 {{ animationReadyCount }} / {{ doorIds.length }} 个门禁
    </p>

    <label class="scene-debug-panel__row">
      <span>选择门禁</span>
      <select
        class="scene-debug-panel__select-wide"
        :value="selectedDoorId"
        @change="emit('update:selectedDoorId', ($event.target as HTMLSelectElement).value)"
      >
        <optgroup v-if="personDoors.length" label="连锁管控门 person">
          <option v-for="doorId in personDoors" :key="doorId" :value="doorId">
            {{ doorId }}
          </option>
        </optgroup>
        <optgroup v-if="tripodDoors.length" label="火车道管控门 tripod">
          <option v-for="doorId in tripodDoors" :key="doorId" :value="doorId">
            {{ doorId }}
          </option>
        </optgroup>
        <optgroup v-if="fullheightDoors.length" label="人脸门禁 fullheight">
          <option v-for="doorId in fullheightDoors" :key="doorId" :value="doorId">
            {{ doorId }}
          </option>
        </optgroup>
        <optgroup v-if="vehicleDoors.length" label="汽车道闸 vehicleBarrier">
          <option v-for="doorId in vehicleDoors" :key="doorId" :value="doorId">
            {{ doorId }}
          </option>
        </optgroup>
        <optgroup v-if="trainDoors.length" label="火车道闸 trainBarrier">
          <option v-for="doorId in trainDoors" :key="doorId" :value="doorId">
            {{ doorId }}
          </option>
        </optgroup>
      </select>
    </label>

    <p class="scene-debug-panel__meta">
      当前：{{ selectedDoorLabel }} · {{ selectedDoorOpen ? '开' : '关' }} ·
      {{ selectedDoorFlowDirection === 'out' ? '出' : '进' }}
    </p>

    <div class="scene-debug-panel__row scene-debug-panel__row--actions">
      <button type="button" class="scene-debug-panel__btn scene-debug-panel__btn--primary" @click="emit('triggerAnimation')">
        触发开关动画
      </button>
      <button type="button" class="scene-debug-panel__btn" @click="emit('toggleFlowDirection')">
        方向：{{ selectedDoorFlowDirection === 'out' ? '出' : '进' }}
      </button>
    </div>

    <div class="scene-debug-panel__row scene-debug-panel__row--actions">
      <button type="button" class="scene-debug-panel__btn" @click="emit('openAll')">
        全部触发
      </button>
    </div>
  </aside>
</template>

<style scoped>
.scene-debug-panel {
  position: absolute;
  left: 0;
  top: 96px;
  z-index: 30;
  width: 300px;
  padding: 14px 12px;
  border: 1px solid rgba(48, 220, 255, 0.45);
  border-radius: 8px;
  background: rgba(2, 8, 16, 0.92);
  box-shadow: 0 0 14px rgba(48, 220, 255, 0.2);
  pointer-events: auto;
}

.scene-debug-panel__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #9fefff;
}

.scene-debug-panel__title--drag {
  cursor: move;
  user-select: none;
}

.scene-debug-panel__hint {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(180, 230, 255, 0.78);
}

.scene-debug-panel__meta {
  margin: 0 0 8px;
  font-size: 11px;
  color: rgba(160, 210, 230, 0.72);
}

.scene-debug-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 12px;
}

.scene-debug-panel__row--actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.scene-debug-panel__row span {
  color: rgba(220, 245, 255, 0.9);
  font-size: 12px;
  flex-shrink: 0;
}

.scene-debug-panel__row select {
  width: 168px;
  height: 30px;
  border: 1px solid rgba(48, 220, 255, 0.35);
  border-radius: 4px;
  background: rgba(7, 21, 36, 0.9);
  color: #d9f8ff;
  font-size: 12px;
  padding: 0 8px;
  outline: none;
}

.scene-debug-panel__select-wide {
  width: 168px !important;
}

.scene-debug-panel__btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(48, 220, 255, 0.45);
  border-radius: 4px;
  background: rgba(12, 48, 72, 0.95);
  color: #c8f4ff;
  font-size: 12px;
  cursor: pointer;
}

.scene-debug-panel__btn--primary {
  border-color: rgba(85, 239, 150, 0.55);
  color: #d8ffe8;
}

.scene-debug-panel__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
