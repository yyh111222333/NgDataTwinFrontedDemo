<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Camera,
  CarFront,
  CircleCheck,
  Clock3,
  FileText,
  IdCard,
  LoaderCircle,
  Phone,
  RefreshCw,
  UserRound,
} from '@lucide/vue'
import {
  createPersonAppointment,
  createVehicleAppointment,
  getAppointmentOptions,
  getRecentAppointments,
} from '@/api/appointments'
import type { AppointmentOptions, AppointmentRecord } from '@/types/appointment'

const pad = (value: number) => String(value).padStart(2, '0')

const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

const defaultPeriod = () => {
  const start = new Date()
  start.setSeconds(0, 0)
  const end = new Date(start.getTime() + 8 * 60 * 60 * 1000)
  return { validFrom: toInputDate(start), validUntil: toInputDate(end) }
}

const initialPeriod = defaultPeriod()
const personForm = reactive({
  name: '',
  phone: '',
  reason: '',
  departmentNo: '',
  idCard: '',
  validFrom: initialPeriod.validFrom,
  validUntil: initialPeriod.validUntil,
  photo: '',
})
const vehicleForm = reactive({
  name: '',
  phone: '',
  plate: '',
  reason: '',
  validFrom: initialPeriod.validFrom,
  validUntil: initialPeriod.validUntil,
})

const options = ref<AppointmentOptions | null>(null)
const optionsLoading = ref(true)
const personSubmitting = ref(false)
const vehicleSubmitting = ref(false)
const faceInput = ref<HTMLInputElement | null>(null)
const faceFileName = ref('')
const recent = ref<AppointmentRecord[]>([])
const toast = ref<{ text: string; kind: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const latest = computed(() => recent.value[0] ?? null)
const k30Online = computed(() => options.value?.available === true)

function notify(text: string, kind: 'success' | 'error') {
  toast.value = { text, kind }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 4500)
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return error instanceof Error ? error.message : '请求失败，请稍后重试'
}

async function loadOptions() {
  optionsLoading.value = true
  try {
    options.value = await getAppointmentOptions()
    const defaultDepartment =
      options.value.default_department_no || options.value.departments[0]?.no
    if (!personForm.departmentNo && defaultDepartment) personForm.departmentNo = defaultDepartment
  } catch (error) {
    options.value = {
      available: false,
      mode: 'portal',
      departments: [],
      devices: [],
      default_department_no: '',
      message: errorMessage(error),
    }
  } finally {
    optionsLoading.value = false
  }
}

async function loadRecent() {
  try {
    recent.value = (await getRecentAppointments()).items
  } catch {
    recent.value = []
  }
}

function resizeFace(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, 720 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('图片处理失败'))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      let result = canvas.toDataURL('image/jpeg', 0.82)
      if (result.length > 2_000_000) result = canvas.toDataURL('image/jpeg', 0.62)
      resolve(result)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取该图片'))
    }
    image.src = url
  })
}

async function handleFaceSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    notify('请选择 JPG 或 PNG 图片', 'error')
    return
  }
  if (file.size > 8 * 1024 * 1024) {
    notify('人脸图片不能超过 8MB', 'error')
    return
  }
  try {
    personForm.photo = await resizeFace(file)
    faceFileName.value = file.name
  } catch (error) {
    notify(errorMessage(error), 'error')
  }
}

async function submitPerson() {
  if (!personForm.name.trim() || !personForm.phone.trim() || !personForm.reason.trim()) {
    notify('请完整填写人员姓名、电话和进厂事由', 'error')
    return
  }
  if (!personForm.photo) {
    notify('请先上传人脸照片', 'error')
    return
  }
  if (!personForm.validFrom || !personForm.validUntil) {
    notify('请选择许可起止时间', 'error')
    return
  }
  personSubmitting.value = true
  try {
    const result = await createPersonAppointment({
      name: personForm.name.trim(),
      phone: personForm.phone.trim(),
      reason: personForm.reason.trim(),
      department_no: personForm.departmentNo,
      device_nos: [],
      id_card: personForm.idCard.trim(),
      sex: 0,
      photo: personForm.photo,
      valid_from: personForm.validFrom,
      valid_until: personForm.validUntil,
    })
    notify(result.sync_message || '人员预约已下发', 'success')
    personForm.name = ''
    personForm.phone = ''
    personForm.reason = ''
    personForm.idCard = ''
    personForm.photo = ''
    faceFileName.value = ''
    await loadRecent()
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    personSubmitting.value = false
  }
}

async function submitVehicle() {
  if (
    !vehicleForm.name.trim() ||
    !vehicleForm.phone.trim() ||
    !vehicleForm.plate.trim() ||
    !vehicleForm.reason.trim()
  ) {
    notify('请完整填写车主、电话、车牌和进厂事由', 'error')
    return
  }
  if (!vehicleForm.validFrom || !vehicleForm.validUntil) {
    notify('请选择许可起止时间', 'error')
    return
  }
  vehicleSubmitting.value = true
  try {
    const result = await createVehicleAppointment({
      name: vehicleForm.name.trim(),
      phone: vehicleForm.phone.trim(),
      plate: vehicleForm.plate.trim().toUpperCase(),
      reason: vehicleForm.reason.trim(),
      valid_from: vehicleForm.validFrom,
      valid_until: vehicleForm.validUntil,
    })
    notify(result.sync_message || '车辆预约已生效', 'success')
    vehicleForm.name = ''
    vehicleForm.phone = ''
    vehicleForm.plate = ''
    vehicleForm.reason = ''
    await loadRecent()
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    vehicleSubmitting.value = false
  }
}

onMounted(() => {
  void loadOptions()
  void loadRecent()
})
</script>

<template>
  <div class="quick-appt">
    <div class="quick-appt__forms">
      <form class="quick-appt__panel" @submit.prevent="submitPerson">
        <header class="quick-appt__panel-head">
          <UserRound :size="13" aria-hidden="true" />
          <h4>人员进厂预约</h4>
          <span
            class="quick-appt__link"
            :class="{ 'quick-appt__link--online': k30Online }"
            :title="options?.message || (k30Online ? 'K30 门禁平台在线' : 'K30 门禁平台离线')"
          >
            {{ optionsLoading ? '检测中' : k30Online ? 'K30在线' : 'K30离线' }}
          </span>
        </header>

        <label class="quick-appt__field">
          <span><UserRound :size="11" />姓名</span>
          <input v-model="personForm.name" maxlength="50" autocomplete="off" />
        </label>
        <label class="quick-appt__field">
          <span><Phone :size="11" />电话</span>
          <input v-model="personForm.phone" maxlength="30" inputmode="tel" autocomplete="off" />
        </label>
        <label class="quick-appt__field">
          <span><IdCard :size="11" />预约部门</span>
          <select v-model="personForm.departmentNo">
            <option v-for="item in options?.departments ?? []" :key="item.no" :value="item.no">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="quick-appt__field">
          <span><FileText :size="11" />进厂事由</span>
          <input v-model="personForm.reason" maxlength="100" autocomplete="off" />
        </label>
        <div class="quick-appt__field">
          <span><Clock3 :size="11" />许可时间</span>
          <div class="quick-appt__time-row">
            <input
              v-model="personForm.validFrom"
              type="datetime-local"
              aria-label="人员许可开始时间"
            />
            <input
              v-model="personForm.validUntil"
              type="datetime-local"
              aria-label="人员许可结束时间"
            />
          </div>
        </div>

        <input
          ref="faceInput"
          class="quick-appt__file"
          type="file"
          accept="image/jpeg,image/png"
          @change="handleFaceSelected"
        />
        <button
          type="button"
          class="quick-appt__upload"
          title="上传人脸照片"
          @click="faceInput?.click()"
        >
          <CircleCheck v-if="personForm.photo" :size="13" />
          <Camera v-else :size="13" />
          <span>{{ faceFileName || '上传人脸' }}</span>
        </button>
        <button class="quick-appt__submit" type="submit" :disabled="personSubmitting">
          <LoaderCircle v-if="personSubmitting" class="quick-appt__spin" :size="13" />
          <span>{{ personSubmitting ? '下发中' : '提交人员预约' }}</span>
        </button>
      </form>

      <form class="quick-appt__panel quick-appt__panel--vehicle" @submit.prevent="submitVehicle">
        <header class="quick-appt__panel-head">
          <CarFront :size="13" aria-hidden="true" />
          <h4>车辆进厂预约</h4>
        </header>

        <label class="quick-appt__field">
          <span><UserRound :size="11" />姓名</span>
          <input v-model="vehicleForm.name" maxlength="50" autocomplete="off" />
        </label>
        <label class="quick-appt__field">
          <span><Phone :size="11" />电话</span>
          <input v-model="vehicleForm.phone" maxlength="30" inputmode="tel" autocomplete="off" />
        </label>
        <label class="quick-appt__field">
          <span><CarFront :size="11" />车牌号</span>
          <input v-model="vehicleForm.plate" maxlength="16" autocomplete="off" />
        </label>
        <label class="quick-appt__field">
          <span><FileText :size="11" />进厂事由</span>
          <input v-model="vehicleForm.reason" maxlength="100" autocomplete="off" />
        </label>
        <div class="quick-appt__field">
          <span><Clock3 :size="11" />许可时间</span>
          <div class="quick-appt__time-row">
            <input
              v-model="vehicleForm.validFrom"
              type="datetime-local"
              aria-label="车辆许可开始时间"
            />
            <input
              v-model="vehicleForm.validUntil"
              type="datetime-local"
              aria-label="车辆许可结束时间"
            />
          </div>
        </div>
        <button
          class="quick-appt__submit quick-appt__submit--vehicle"
          type="submit"
          :disabled="vehicleSubmitting"
        >
          <LoaderCircle v-if="vehicleSubmitting" class="quick-appt__spin" :size="13" />
          <span>{{ vehicleSubmitting ? '保存中' : '提交车辆预约' }}</span>
        </button>
      </form>
    </div>

    <div
      class="quick-appt__status"
      :class="`quick-appt__status--${latest?.sync_status ?? 'empty'}`"
    >
      <span class="quick-appt__status-dot" aria-hidden="true" />
      <span v-if="latest" class="quick-appt__status-text">
        {{ latest.appointment_type === 'person' ? latest.subject_name : latest.plate }} ·
        {{ latest.sync_message || '等待下发' }}
      </span>
      <span v-else class="quick-appt__status-text">暂无预约记录</span>
      <button type="button" title="刷新预约状态" @click="loadRecent">
        <RefreshCw :size="12" />
      </button>
    </div>

    <div v-if="toast" class="quick-appt__toast" :class="`quick-appt__toast--${toast.kind}`">
      {{ toast.text }}
    </div>
  </div>
</template>

<style scoped>
.quick-appt {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 0;
  color: #e8fbff;
}

.quick-appt__forms {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 0;
}

.quick-appt__panel {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 0 6px 0 1px;
}

.quick-appt__panel--vehicle {
  padding: 0 1px 0 7px;
  border-left: 1px solid rgba(48, 220, 255, 0.16);
}

.quick-appt__panel-head {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 21px;
  color: #8cefff;
}

.quick-appt__panel-head h4 {
  margin: 0;
  color: rgba(225, 248, 255, 0.92);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}

.quick-appt__link {
  display: inline-flex;
  align-items: center;
  height: 14px;
  margin-left: auto;
  padding: 0 4px;
  border: 1px solid rgba(255, 118, 118, 0.35);
  border-radius: 3px;
  color: rgba(255, 153, 153, 0.9);
  font-size: 8px;
  line-height: 1;
  white-space: nowrap;
}

.quick-appt__link--online {
  border-color: rgba(63, 214, 155, 0.4);
  color: #76e7b9;
}

.quick-appt__field {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.quick-appt__field > span {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 13px;
  color: rgba(205, 237, 247, 0.82);
  font-size: 9px;
  line-height: 1;
}

.quick-appt input,
.quick-appt select {
  width: 100%;
  min-width: 0;
  height: 20px;
  box-sizing: border-box;
  border: 1px solid rgba(48, 220, 255, 0.16);
  border-radius: 3px;
  outline: none;
  background: rgba(3, 10, 20, 0.6);
  color: #e8fbff;
  font: inherit;
  font-size: 9px;
  letter-spacing: 0;
}

.quick-appt input {
  padding: 0 5px;
}

.quick-appt select {
  padding: 0 2px;
}

.quick-appt input:focus,
.quick-appt select:focus {
  border-color: rgba(92, 232, 255, 0.5);
  box-shadow: 0 0 0 1px rgba(48, 200, 255, 0.08);
}

.quick-appt input[type='datetime-local'] {
  height: 19px;
  padding: 0 1px;
  font-size: 7px;
  color-scheme: dark;
}

.quick-appt__time-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 2px;
}

.quick-appt__file {
  display: none;
}

.quick-appt__upload,
.quick-appt__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 22px;
  box-sizing: border-box;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
}

.quick-appt__upload {
  margin-top: 1px;
  border: 1px dashed rgba(48, 220, 255, 0.34);
  background: rgba(6, 20, 36, 0.58);
  color: rgba(176, 235, 251, 0.94);
}

.quick-appt__upload span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-appt__submit {
  border: 1px solid rgba(48, 220, 255, 0.34);
  background: rgba(10, 46, 70, 0.82);
  color: #e8fbff;
}

.quick-appt__submit--vehicle {
  margin-top: auto;
}

.quick-appt__submit:hover,
.quick-appt__upload:hover {
  border-color: rgba(92, 232, 255, 0.58);
  background-color: rgba(14, 55, 82, 0.9);
}

.quick-appt__submit:disabled {
  cursor: wait;
  opacity: 0.65;
}

.quick-appt__status {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 23px;
  min-width: 0;
  padding: 0 5px 0 7px;
  border-top: 1px solid rgba(48, 220, 255, 0.12);
  background: rgba(5, 17, 30, 0.45);
  color: rgba(205, 237, 247, 0.76);
  font-size: 9px;
}

.quick-appt__status-dot {
  width: 5px;
  height: 5px;
  flex: 0 0 5px;
  border-radius: 50%;
  background: #74879a;
}

.quick-appt__status--active .quick-appt__status-dot {
  background: #48d89e;
  box-shadow: 0 0 5px rgba(72, 216, 158, 0.55);
}

.quick-appt__status--failed .quick-appt__status-dot {
  background: #ff7e7e;
}

.quick-appt__status--pending .quick-appt__status-dot {
  background: #ffc95c;
}

.quick-appt__status-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-appt__status button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8cefff;
  cursor: pointer;
}

.quick-appt__toast {
  position: absolute;
  right: 4px;
  bottom: 27px;
  left: 4px;
  z-index: 5;
  padding: 6px 8px;
  border: 1px solid rgba(72, 216, 158, 0.42);
  border-radius: 3px;
  background: rgba(5, 30, 31, 0.96);
  color: #aaf1d3;
  font-size: 10px;
  line-height: 1.35;
  text-align: center;
}

.quick-appt__toast--error {
  border-color: rgba(255, 126, 126, 0.5);
  background: rgba(43, 17, 24, 0.96);
  color: #ffc1c1;
}

.quick-appt__spin {
  animation: quick-appt-spin 0.8s linear infinite;
}

@keyframes quick-appt-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
