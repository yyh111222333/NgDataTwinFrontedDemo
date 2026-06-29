<!-- 门禁动画测试面板（F8）：手动触发 + 实时过门 API 模拟 -->
<script setup lang="ts">
import { groupSceneDoorLabel } from '@/components/cockpit/sceneMount/sceneDoorIds'
import { GATE_ACCESS_EVENTS_API_EXAMPLE } from '@/types/gate-access'
import type { DoorFlowDirection } from '@/types/door'
import type { GateAccessEvent } from '@/types/gate-access'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  visible: boolean
  doorIds: string[]
  selectedDoorId: string
  selectedDoorOpen: boolean
  selectedDoorFlowDirection: DoorFlowDirection
  animationReadyCount: number
  gateAccessPolling: boolean
  gateAccessUseMock: boolean
  gateAccessCursor: string
  gateAccessError: string | null
  recentGateEvents: GateAccessEvent[]
}>()

const emit = defineEmits<{
  (e: 'update:selectedDoorId', value: string): void
  (e: 'triggerAnimation'): void
  (e: 'toggleFlowDirection'): void
  (e: 'openAll'): void
  (e: 'update:gateAccessPolling', value: boolean): void
  (e: 'update:gateAccessUseMock', value: boolean): void
  (e: 'simulateGatePass'): void
  (e: 'clearGateEvents'): void
}>()

const showApiExample = ref(false)
const apiExampleText = JSON.stringify(GATE_ACCESS_EVENTS_API_EXAMPLE, null, 2)

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

const formatDirection = (direction: DoorFlowDirection) => (direction === 'in' ? '进' : '出')

const formatEventTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString('zh-CN', { hour12: false })
}

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

    <div class="scene-debug-panel__divider" />

    <div class="scene-debug-panel__section-title">实时过门 API</div>
    <p class="scene-debug-panel__hint">
      模拟后端推送过门事件：先设置方向，再触发动画。接入真实 API 时仅需切换数据源并保持 cursor 轮询。
    </p>

    <label class="scene-debug-panel__row">
      <span>数据源</span>
      <select
        class="scene-debug-panel__select-wide"
        :value="gateAccessUseMock ? 'mock' : 'api'"
        @change="emit('update:gateAccessUseMock', ($event.target as HTMLSelectElement).value === 'mock')"
      >
        <option value="mock">Mock（本地模拟）</option>
        <option value="api">真实 API</option>
      </select>
    </label>

    <p class="scene-debug-panel__meta">
      轮询：{{ gateAccessPolling ? '运行中' : '已停止' }}
      <template v-if="gateAccessCursor"> · cursor {{ gateAccessCursor }}</template>
    </p>
    <p v-if="gateAccessError" class="scene-debug-panel__error">{{ gateAccessError }}</p>

    <div class="scene-debug-panel__row scene-debug-panel__row--actions">
      <button
        type="button"
        class="scene-debug-panel__btn scene-debug-panel__btn--primary"
        @click="emit('update:gateAccessPolling', !gateAccessPolling)"
      >
        {{ gateAccessPolling ? '停止轮询' : '开始轮询' }}
      </button>
      <button type="button" class="scene-debug-panel__btn" @click="emit('simulateGatePass')">
        模拟当前门过门
      </button>
    </div>

    <div class="scene-debug-panel__row scene-debug-panel__row--actions">
      <button type="button" class="scene-debug-panel__btn" @click="showApiExample = !showApiExample">
        {{ showApiExample ? '隐藏' : '查看' }} API 返回示例
      </button>
      <button type="button" class="scene-debug-panel__btn" @click="emit('clearGateEvents')">
        清空事件
      </button>
    </div>

    <pre v-if="showApiExample" class="scene-debug-panel__code">{{ apiExampleText }}</pre>

    <ul v-if="recentGateEvents.length" class="scene-debug-panel__events">
      <li v-for="event in recentGateEvents" :key="event.eventId" class="scene-debug-panel__event">
        <span class="scene-debug-panel__event-time">{{ formatEventTime(event.occurredAt) }}</span>
        <span class="scene-debug-panel__event-door">{{ event.doorId }}</span>
        <span
          class="scene-debug-panel__event-dir"
          :class="event.direction === 'in' ? 'scene-debug-panel__event-dir--in' : 'scene-debug-panel__event-dir--out'"
        >
          {{ formatDirection(event.direction) }}
        </span>
        <span v-if="event.personName" class="scene-debug-panel__event-person">{{ event.personName }}</span>
      </li>
    </ul>
    <p v-else class="scene-debug-panel__meta">暂无过门事件</p>
  </aside>
</template>

<style scoped>
.scene-debug-panel {
  position: absolute;
  left: 0;
  top: 96px;
  z-index: 30;
  width: 340px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
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

.scene-debug-panel__divider {
  margin: 12px 0 8px;
  border-top: 1px solid rgba(48, 220, 255, 0.2);
}

.scene-debug-panel__section-title {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #9fefff;
}

.scene-debug-panel__error {
  margin: 0 0 8px;
  font-size: 11px;
  color: #ff9a9a;
}

.scene-debug-panel__code {
  margin: 0 0 8px;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(200, 240, 255, 0.88);
  font-size: 10px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-all;
}

.scene-debug-panel__events {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 160px;
  overflow-y: auto;
}

.scene-debug-panel__event {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 4px 6px;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(48, 220, 255, 0.12);
  font-size: 11px;
}

.scene-debug-panel__event-time {
  color: rgba(160, 210, 230, 0.72);
}

.scene-debug-panel__event-door {
  color: #d9f8ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-debug-panel__event-dir {
  font-weight: 600;
}

.scene-debug-panel__event-dir--in {
  color: #7dffb0;
}

.scene-debug-panel__event-dir--out {
  color: #ffd27d;
}

.scene-debug-panel__event-person {
  grid-column: 2 / -1;
  color: rgba(160, 210, 230, 0.72);
}
</style>
