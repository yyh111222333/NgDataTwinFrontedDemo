<script setup lang="ts">
import { computed, ref } from 'vue'

type StatusValue = '空闲' | '占用'
type DeviceStatRecord = {
  region: string
  device: string
  online: number
  offline: number
}

const props = defineProps<{
  visible: boolean
  onlineAccess: number
  areaTotal: number
  vehiclesOnSite: number
  railStatus: StatusValue
  regions: string[]
  devices: string[]
  records: DeviceStatRecord[]
}>()

const emit = defineEmits<{
  (e: 'update:onlineAccess', value: number): void
  (e: 'update:areaTotal', value: number): void
  (e: 'update:vehiclesOnSite', value: number): void
  (e: 'update:railStatus', value: StatusValue): void
  (e: 'update:record', payload: DeviceStatRecord): void
}>()

const toNum = (v: string) => {
  const parsed = Number(v)
  return Number.isFinite(parsed) ? parsed : 0
}

const selectedRegion = ref('A区')
const selectedDevice = ref('人员智能门/联锁门')

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
  <aside v-if="visible" class="cockpit-debug-panel">
    <div class="cockpit-debug-panel__title">测试面板（F8）</div>

    <label class="cockpit-debug-panel__row">
      <span>在线门禁</span>
      <input
        type="number"
        :value="onlineAccess"
        min="0"
        @input="emit('update:onlineAccess', toNum(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>区域总人数</span>
      <input
        type="number"
        :value="areaTotal"
        min="0"
        @input="emit('update:areaTotal', toNum(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>车辆在场</span>
      <input
        type="number"
        :value="vehiclesOnSite"
        min="0"
        @input="emit('update:vehiclesOnSite', toNum(($event.target as HTMLInputElement).value))"
      />
    </label>

    <label class="cockpit-debug-panel__row">
      <span>火车道状态</span>
      <select
        :value="railStatus"
        @change="emit('update:railStatus', ($event.target as HTMLSelectElement).value as StatusValue)"
      >
        <option value="空闲">空闲（绿色）</option>
        <option value="占用">占用（红色）</option>
      </select>
    </label>

    <div class="cockpit-debug-panel__split"></div>
    <div class="cockpit-debug-panel__title">设备状态测试数据</div>

    <label class="cockpit-debug-panel__row">
      <span>区域</span>
      <select v-model="selectedRegion">
        <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
      </select>
    </label>

    <label class="cockpit-debug-panel__row">
      <span>设备</span>
      <select v-model="selectedDevice">
        <option v-for="device in devices" :key="device" :value="device">{{ device }}</option>
      </select>
    </label>

    <label class="cockpit-debug-panel__row">
      <span>在线个数</span>
      <input
        type="number"
        :value="currentRecord.online"
        min="0"
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
  right: 20px;
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
.cockpit-debug-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  gap: 12px;
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
.cockpit-debug-panel__split {
  margin-top: 10px;
  border-top: 1px dashed rgba(48, 220, 255, 0.25);
}
</style>

