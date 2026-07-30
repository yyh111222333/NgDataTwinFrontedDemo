<script setup lang="ts">
import axios from 'axios'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
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
  X,
} from '@lucide/vue'
import {
  createPersonAppointment,
  createVehicleAppointment,
  getAppointmentOptions,
  getRecentAppointments,
} from '@/api/appointments'
import type { AppointmentOptions, AppointmentRecord } from '@/types/appointment'
import { importRegisteredVehicles } from '@/api/parking'
import type { VehicleImportResult, VehiclePayload } from '@/types/parking'
import { downloadVehicleImportTemplate, parseVehicleImportFile } from '@/utils/vehicle-import'

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
  plateColor: 'auto' as 'auto' | 'blue' | 'yellow' | 'green',
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
const vehicleImportOpen = ref(false)
const vehicleImporting = ref(false)
const vehicleImportInput = ref<HTMLInputElement | null>(null)
const vehicleImportFileName = ref('')
const vehicleImportRows = ref<VehiclePayload[]>([])
const vehicleImportResult = ref<VehicleImportResult | null>(null)
const vehicleImportDuplicateMode = ref<'skip' | 'update'>('skip')
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
      plate_color: vehicleForm.plateColor,
      reason: vehicleForm.reason.trim(),
      valid_from: vehicleForm.validFrom,
      valid_until: vehicleForm.validUntil,
    })
    notify(result.sync_message || '车辆预约已生效', 'success')
    vehicleForm.name = ''
    vehicleForm.phone = ''
    vehicleForm.plate = ''
    vehicleForm.plateColor = 'auto'
    vehicleForm.reason = ''
    await loadRecent()
  } catch (error) {
    notify(errorMessage(error), 'error')
    await loadRecent()
  } finally {
    vehicleSubmitting.value = false
  }
}

function openVehicleImport() {
  vehicleImportFileName.value = ''
  vehicleImportRows.value = []
  vehicleImportResult.value = null
  vehicleImportDuplicateMode.value = 'skip'
  vehicleImportOpen.value = true
}

function selectVehicleImportFile() {
  vehicleImportInput.value?.click()
}

function toggleVehicleImportDuplicateMode(event: Event) {
  vehicleImportDuplicateMode.value = (event.target as HTMLInputElement).checked ? 'update' : 'skip'
}

async function handleVehicleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  vehicleImportFileName.value = file.name
  vehicleImportResult.value = null
  try {
    vehicleImportRows.value = await parseVehicleImportFile(file)
  } catch (error) {
    vehicleImportRows.value = []
    notify(`文件读取失败：${errorMessage(error)}`, 'error')
  }
}

async function submitVehicleImport() {
  if (vehicleImportRows.value.length === 0) {
    notify('请选择有效的CSV或TXT文件', 'error')
    return
  }

  vehicleImporting.value = true
  try {
    vehicleImportResult.value = await importRegisteredVehicles(
      vehicleImportRows.value,
      vehicleImportDuplicateMode.value,
    )
    const result = vehicleImportResult.value
    notify(
      `导入完成：新增${result.created}，更新${result.updated}，跳过${result.skipped}，失败${result.failed}`,
      result.failed > 0 ? 'error' : 'success',
    )
  } catch (error) {
    notify(errorMessage(error), 'error')
  } finally {
    vehicleImporting.value = false
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
          <button
            type="button"
            class="quick-appt__batch-trigger"
            title="批量导入7至11号门车辆白名单"
            @click="openVehicleImport"
          >
            <ArrowUpFromLine :size="11" />
            <span>批量</span>
          </button>
        </header>

        <label class="quick-appt__field">
          <span><UserRound :size="11" />姓名</span>
          <input v-model="vehicleForm.name" maxlength="50" autocomplete="off" />
        </label>
        <label class="quick-appt__field">
          <span><Phone :size="11" />电话</span>
          <input v-model="vehicleForm.phone" maxlength="30" inputmode="tel" autocomplete="off" />
        </label>
        <div class="quick-appt__plate-row">
          <label class="quick-appt__field">
            <span><CarFront :size="11" />车牌号</span>
            <input v-model="vehicleForm.plate" maxlength="16" autocomplete="off" />
          </label>
          <label class="quick-appt__field">
            <span>颜色</span>
            <select v-model="vehicleForm.plateColor">
              <option value="auto">自动</option>
              <option value="blue">蓝牌</option>
              <option value="yellow">黄牌</option>
              <option value="green">绿牌</option>
            </select>
          </label>
        </div>
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
          <span>{{ vehicleSubmitting ? '下发中' : '下发车辆预约' }}</span>
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

    <Teleport to="body">
      <div
        v-if="vehicleImportOpen"
        class="quick-appt-import__backdrop"
        @click.self="vehicleImportOpen = false"
      >
        <section class="quick-appt-import" role="dialog" aria-modal="true">
          <header class="quick-appt-import__head">
            <div>
              <h3>批量导入车辆</h3>
              <p>统一车辆白名单 · 7至11号门</p>
            </div>
            <button type="button" title="关闭" @click="vehicleImportOpen = false">
              <X :size="18" />
            </button>
          </header>

          <div class="quick-appt-import__file-row">
            <button type="button" class="is-primary" @click="selectVehicleImportFile">
              <ArrowUpFromLine :size="15" />
              选择文件
            </button>
            <button type="button" @click="downloadVehicleImportTemplate">
              <ArrowDownToLine :size="15" />
              下载模板
            </button>
            <span>{{ vehicleImportFileName || '支持 CSV / TXT，单次最多500辆' }}</span>
            <input
              ref="vehicleImportInput"
              class="quick-appt-import__file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              @change="handleVehicleImportFile"
            />
          </div>

          <label class="quick-appt-import__toggle">
            <input
              :checked="vehicleImportDuplicateMode === 'update'"
              type="checkbox"
              @change="toggleVehicleImportDuplicateMode"
            />
            <span>覆盖已有车牌档案</span>
          </label>

          <div class="quick-appt-import__summary">
            <template v-if="vehicleImportResult">
              <div>
                <span>新增</span><strong>{{ vehicleImportResult.created }}</strong>
              </div>
              <div>
                <span>更新</span><strong>{{ vehicleImportResult.updated }}</strong>
              </div>
              <div>
                <span>跳过</span><strong>{{ vehicleImportResult.skipped }}</strong>
              </div>
              <div :class="{ 'has-error': vehicleImportResult.failed > 0 }">
                <span>失败</span><strong>{{ vehicleImportResult.failed }}</strong>
              </div>
            </template>
            <div v-else class="is-full">
              <span>待导入</span><strong>{{ vehicleImportRows.length }}</strong>
            </div>
          </div>

          <div class="quick-appt-import__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>行号</th>
                  <th>车牌号码</th>
                  <th>车主</th>
                  <th>所属部门</th>
                  <th>{{ vehicleImportResult ? '导入结果' : '车辆类型' }}</th>
                </tr>
              </thead>
              <tbody v-if="vehicleImportResult">
                <tr v-for="item in vehicleImportResult.items" :key="`${item.row}-${item.plate}`">
                  <td>{{ item.row }}</td>
                  <td>
                    <strong>{{ item.plate || '-' }}</strong>
                  </td>
                  <td colspan="2">{{ item.message }}</td>
                  <td>
                    {{
                      {
                        created: '已新增',
                        updated: '已更新',
                        skipped: '已跳过',
                        failed: '失败',
                      }[item.status]
                    }}
                  </td>
                </tr>
              </tbody>
              <tbody v-else-if="vehicleImportRows.length > 0">
                <tr v-for="(item, index) in vehicleImportRows.slice(0, 20)" :key="index">
                  <td>{{ index + 1 }}</td>
                  <td>
                    <strong>{{ item.plate || '-' }}</strong>
                  </td>
                  <td>{{ item.owner || '-' }}</td>
                  <td>{{ item.department || '-' }}</td>
                  <td>{{ item.vehicle_type }}</td>
                </tr>
              </tbody>
            </table>
            <div
              v-if="!vehicleImportResult && vehicleImportRows.length === 0"
              class="quick-appt-import__empty"
            >
              <ArrowUpFromLine :size="26" />
              <span>请选择导入文件</span>
            </div>
          </div>

          <footer class="quick-appt-import__actions">
            <button type="button" @click="vehicleImportOpen = false">关闭</button>
            <button
              v-if="!vehicleImportResult"
              type="button"
              class="is-primary"
              :disabled="vehicleImporting || vehicleImportRows.length === 0"
              @click="submitVehicleImport"
            >
              <LoaderCircle v-if="vehicleImporting" class="quick-appt__spin" :size="14" />
              {{ vehicleImporting ? '导入中' : '开始导入' }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
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

.quick-appt__batch-trigger {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 16px;
  margin-left: auto;
  padding: 0 4px;
  border: 1px solid rgba(92, 232, 255, 0.34);
  border-radius: 3px;
  background: rgba(8, 40, 61, 0.74);
  color: #8cefff;
  font-size: 8px;
  line-height: 1;
  cursor: pointer;
}

.quick-appt__batch-trigger:hover {
  border-color: rgba(92, 232, 255, 0.62);
  background: rgba(14, 55, 82, 0.9);
}

.quick-appt__field {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.quick-appt__plate-row {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(48px, 0.55fr);
  gap: 3px;
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

.quick-appt-import__backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 7, 15, 0.78);
  backdrop-filter: blur(3px);
}

.quick-appt-import {
  width: min(760px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid rgba(73, 221, 255, 0.42);
  border-radius: 6px;
  background: #071421;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.52);
  color: #e8fbff;
  font-family: 'Microsoft YaHei', sans-serif;
  letter-spacing: 0;
}

.quick-appt-import button,
.quick-appt-import input {
  font: inherit;
  letter-spacing: 0;
}

.quick-appt-import__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(73, 221, 255, 0.18);
}

.quick-appt-import__head h3,
.quick-appt-import__head p {
  margin: 0;
}

.quick-appt-import__head h3 {
  font-size: 18px;
}

.quick-appt-import__head p {
  margin-top: 4px;
  color: rgba(185, 225, 237, 0.68);
  font-size: 12px;
}

.quick-appt-import__head button {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  border: 1px solid rgba(73, 221, 255, 0.22);
  border-radius: 4px;
  background: rgba(6, 25, 40, 0.8);
  color: #a8efff;
  cursor: pointer;
}

.quick-appt-import__file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px 10px;
}

.quick-appt-import__file-row button,
.quick-appt-import__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(73, 221, 255, 0.3);
  border-radius: 4px;
  background: rgba(7, 30, 47, 0.86);
  color: #c8f5ff;
  cursor: pointer;
}

.quick-appt-import button.is-primary {
  border-color: rgba(55, 224, 169, 0.5);
  background: #0f7557;
  color: #fff;
}

.quick-appt-import button:disabled {
  cursor: not-allowed;
  opacity: 0.46;
}

.quick-appt-import__file-row > span {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: rgba(185, 225, 237, 0.72);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-appt-import__file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.quick-appt-import__toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0 18px 12px;
  color: rgba(205, 237, 247, 0.82);
  font-size: 12px;
}

.quick-appt-import__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0 18px 12px;
  overflow: hidden;
  border: 1px solid rgba(73, 221, 255, 0.18);
  border-radius: 4px;
  background: rgba(73, 221, 255, 0.12);
  gap: 1px;
}

.quick-appt-import__summary div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 13px;
  background: #0a1b2a;
}

.quick-appt-import__summary .is-full {
  grid-column: 1 / -1;
}

.quick-appt-import__summary span {
  color: rgba(185, 225, 237, 0.68);
  font-size: 12px;
}

.quick-appt-import__summary strong {
  font-size: 18px;
}

.quick-appt-import__summary .has-error strong {
  color: #ff9696;
}

.quick-appt-import__table-wrap {
  position: relative;
  min-height: 230px;
  max-height: min(360px, calc(100vh - 330px));
  margin: 0 18px;
  overflow: auto;
  border: 1px solid rgba(73, 221, 255, 0.18);
  border-radius: 4px;
}

.quick-appt-import table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.quick-appt-import th,
.quick-appt-import td {
  height: 38px;
  padding: 0 10px;
  border-bottom: 1px solid rgba(73, 221, 255, 0.1);
  text-align: left;
}

.quick-appt-import th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #0c2132;
  color: rgba(185, 225, 237, 0.76);
  font-weight: 500;
}

.quick-appt-import td {
  color: rgba(225, 248, 255, 0.9);
}

.quick-appt-import__empty {
  position: absolute;
  inset: 38px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: rgba(185, 225, 237, 0.5);
  font-size: 12px;
}

.quick-appt-import__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px 16px;
}

@keyframes quick-appt-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
