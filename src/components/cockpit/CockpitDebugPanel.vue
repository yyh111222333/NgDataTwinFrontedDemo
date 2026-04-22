<script setup lang="ts">
import type { DashboardDeviceRecord, RailStatus } from '@/types/dashboard'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export type CockpitDataSource = 'mock' | 'api'

const props = defineProps<{
  visible: boolean
  dataSource: CockpitDataSource
  apiLoading?: boolean
  apiError?: string | null
  onlineAccess: number
  areaTotal: number
  vehiclesOnSite: number
  railStatus: RailStatus
  regions: string[]
  devices: string[]
  records: DashboardDeviceRecord[]
}>()

const emit = defineEmits<{
  (e: 'update:dataSource', value: CockpitDataSource): void
  (e: 'refresh'): void
  (e: 'update:regions', value: string[]): void
  (e: 'update:devices', value: string[]): void
  (e: 'update:onlineAccess', value: number): void
  (e: 'update:areaTotal', value: number): void
  (e: 'update:vehiclesOnSite', value: number): void
  (e: 'update:railStatus', value: RailStatus): void
  (e: 'update:record', payload: DashboardDeviceRecord): void
}>()

const toNum = (v: string) => {
  const parsed = Number(v)
  return Number.isFinite(parsed) ? parsed : 0
}

const selectedRegion = ref('A区')
const selectedDevice = ref('人员智能门/联锁门')
const regionDraft = ref('')
const deviceDraft = ref('')
const panelRef = ref<HTMLElement | null>(null)
const panelLeft = ref(0)
const panelTop = ref(96)
const isDragging = ref(false)
let dragOffsetX = 0
let dragOffsetY = 0

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
  const panelWidth = panelRef.value?.offsetWidth ?? 280
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

const editLocked = computed(() => props.dataSource === 'api' || props.apiLoading === true)

const formatList = (items: string[]) => items.join(', ')

const parseList = (raw: string) =>
  raw
    .split(/[,，]/)
    .map((it) => it.trim())
    .filter((it, idx, arr) => it.length > 0 && arr.indexOf(it) === idx)

const applyRegionDraft = () => {
  const parsed = parseList(regionDraft.value)
  if (parsed.length > 0) emit('update:regions', parsed)
}

const applyDeviceDraft = () => {
  const parsed = parseList(deviceDraft.value)
  if (parsed.length > 0) emit('update:devices', parsed)
}

watch(
  () => props.regions,
  (next) => {
    regionDraft.value = formatList(next)
    if (!next.includes(selectedRegion.value)) {
      selectedRegion.value = next[0] ?? ''
    }
  },
  { immediate: true },
)

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

watch(
  () => props.devices,
  (next) => {
    deviceDraft.value = formatList(next)
    if (!next.includes(selectedDevice.value)) {
      selectedDevice.value = next[0] ?? ''
    }
  },
  { immediate: true },
)

const currentRecord = computed(() => {
  return (
    props.records.find((it) => it.region === selectedRegion.value && it.device === selectedDevice.value) ?? {
      region: selectedRegion.value,
      device: selectedDevice.value,
      online: 0,
      offline: 0,
    }
  )
})
</script>

<template>
  <aside
    v-if="visible"
    ref="panelRef"
    class="cockpit-debug-panel"
    :style="{ left: `${panelLeft}px`, top: `${panelTop}px` }"
  >
    <div class="cockpit-debug-panel__title cockpit-debug-panel__title--drag" @mousedown.prevent="startDrag">
      测试面板（F8）
    </div>

    <label class="cockpit-debug-panel__row">
      <span>数据来源</span>
      <select
        class="cockpit-debug-panel__select-wide"
        :value="dataSource"
        :disabled="apiLoading"
        @change="emit('update:dataSource', ($event.target as HTMLSelectElement).value as CockpitDataSource)"
      >
        <option value="mock">本地模拟</option>
        <option value="api">接口</option>
      </select>
    </label>

    <p v-if="apiError" class="cockpit-debug-panel__error">{{ apiError }}</p>

    <div v-if="dataSource === 'api'" class="cockpit-debug-panel__row cockpit-debug-panel__row--actions">
      <button
        type="button"
        class="cockpit-debug-panel__btn"
        :disabled="apiLoading"
        @click="emit('refresh')"
      >
        {{ apiLoading ? '拉取中…' : '重新拉取' }}
      </button>
    </div>

    <div class="cockpit-debug-panel__split"></div>
    <div class="cockpit-debug-panel__title">概览数值</div>
    <p v-if="editLocked" class="cockpit-debug-panel__hint">接口模式下为只读</p>

    <label class="cockpit-debug-panel__row">
      <span>在线门禁</span>
      <input
        type="number"
        :value="onlineAccess"
        min="0"
        :disabled="editLocked"
        @input="emit('update:onlineAccess', toNum(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>区域总人数</span>
      <input
        type="number"
        :value="areaTotal"
        min="0"
        :disabled="editLocked"
        @input="emit('update:areaTotal', toNum(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>车辆在场</span>
      <input
        type="number"
        :value="vehiclesOnSite"
        min="0"
        :disabled="editLocked"
        @input="emit('update:vehiclesOnSite', toNum(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>火车道状态</span>
      <select
        :value="railStatus"
        :disabled="editLocked"
        @change="emit('update:railStatus', ($event.target as HTMLSelectElement).value as RailStatus)"
      >
        <option value="空闲">空闲（绿色）</option>
        <option value="占用">占用（红色）</option>
      </select>
    </label>

    <div class="cockpit-debug-panel__split"></div>
    <div class="cockpit-debug-panel__title">设备状态测试数据</div>
    <p v-if="!editLocked" class="cockpit-debug-panel__hint">区域/设备可手动编辑，英文或中文逗号分隔</p>

    <label class="cockpit-debug-panel__row">
      <span>区域列表</span>
      <input
        v-model="regionDraft"
        class="cockpit-debug-panel__input-wide"
        type="text"
        :disabled="editLocked"
        @blur="applyRegionDraft"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>设备列表</span>
      <input
        v-model="deviceDraft"
        class="cockpit-debug-panel__input-wide"
        type="text"
        :disabled="editLocked"
        @blur="applyDeviceDraft"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>区域</span>
      <select v-model="selectedRegion" class="cockpit-debug-panel__select-wide" :disabled="editLocked">
        <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
      </select>
    </label>

    <label class="cockpit-debug-panel__row">
      <span>设备</span>
      <select v-model="selectedDevice" class="cockpit-debug-panel__select-wide" :disabled="editLocked">
        <option v-for="device in devices" :key="device" :value="device">{{ device }}</option>
      </select>
    </label>

    <label class="cockpit-debug-panel__row">
      <span>在线个数</span>
      <input
        type="number"
        :value="currentRecord.online"
        min="0"
        :disabled="editLocked"
        @input="
          emit('update:record', {
            region: selectedRegion,
            device: selectedDevice,
            online: toNum(($event.target as HTMLInputElement).value),
            offline: currentRecord.offline,
          })
        "
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>离线个数</span>
      <input
        type="number"
        :value="currentRecord.offline"
        min="0"
        :disabled="editLocked"
        @input="
          emit('update:record', {
            region: selectedRegion,
            device: selectedDevice,
            online: currentRecord.online,
            offline: toNum(($event.target as HTMLInputElement).value),
          })
        "
      />
    </label>
  </aside>
</template>

<style scoped>
.cockpit-debug-panel {
  position: absolute;
  left: 0;
  top: 96px;
  z-index: 10;
  width: 280px;
  padding: 14px 12px;
  border: 1px solid rgba(48, 220, 255, 0.45);
  border-radius: 8px;
  background: rgba(2, 8, 16, 0.92);
  box-shadow: 0 0 14px rgba(48, 220, 255, 0.2);
}
.cockpit-debug-panel__title {
  margin-bottom: 10px;
  font-size: 13px;
  color: #9fefff;
}
.cockpit-debug-panel__title--drag {
  cursor: move;
  user-select: none;
}
.cockpit-debug-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 12px;
}
.cockpit-debug-panel__row--actions {
  justify-content: flex-end;
}
.cockpit-debug-panel__row span {
  color: rgba(220, 245, 255, 0.9);
  font-size: 12px;
}
.cockpit-debug-panel__row input,
.cockpit-debug-panel__row select {
  width: 120px;
  height: 28px;
  border: 1px solid rgba(48, 220, 255, 0.35);
  border-radius: 4px;
  background: rgba(7, 21, 36, 0.9);
  color: #d9f8ff;
  font-size: 12px;
  padding: 0 8px;
  outline: none;
}
.cockpit-debug-panel__select-wide {
  width: 160px !important;
}
.cockpit-debug-panel__input-wide {
  width: 160px !important;
}
.cockpit-debug-panel__btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(48, 220, 255, 0.45);
  border-radius: 4px;
  background: rgba(12, 48, 72, 0.95);
  color: #c8f4ff;
  font-size: 12px;
  cursor: pointer;
}
.cockpit-debug-panel__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.cockpit-debug-panel__hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: rgba(180, 230, 255, 0.75);
}
.cockpit-debug-panel__error {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: #ff9b9b;
}
.cockpit-debug-panel__split {
  margin-top: 10px;
  border-top: 1px dashed rgba(48, 220, 255, 0.25);
}
</style>
