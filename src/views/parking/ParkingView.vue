<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Camera,
  CarFront,
  ChevronLeft,
  ChevronRight,
  CircleParking,
  DoorOpen,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
  X,
} from '@lucide/vue'
import {
  clearParkingToken,
  createRegisteredVehicle,
  deleteRegisteredVehicle,
  getParkingEvents,
  getParkingGates,
  getParkingMe,
  getParkingSessions,
  getParkingStats,
  getParkingToken,
  getRegisteredVehicles,
  loginParking,
  openParkingGate,
  parkingImageUrl,
  syncParkingGate,
  updateRegisteredVehicle,
} from '@/api/parking'
import type {
  ParkingEvent,
  ParkingGate,
  ParkingSession,
  ParkingStats,
  RegisteredVehicle,
  VehiclePayload,
} from '@/types/parking'

type TabId = 'overview' | 'events' | 'onsite' | 'vehicles' | 'gates'

const router = useRouter()
const activeTab = ref<TabId>('overview')
const sidebarOpen = ref(false)
const refreshing = ref(false)
const loggedIn = ref(false)
const currentUser = ref('')
const loginOpen = ref(false)
const loginBusy = ref(false)
const loginError = ref('')
const pendingTab = ref<TabId | null>(null)
const loginForm = reactive({ username: 'admin', password: '' })
const toast = ref<{ text: string; kind: 'success' | 'error' } | null>(null)

const stats = ref<ParkingStats | null>(null)
const gates = ref<ParkingGate[]>([])
const latestEvents = ref<ParkingEvent[]>([])
const eventRows = ref<ParkingEvent[]>([])
const eventTotal = ref(0)
const sessions = ref<ParkingSession[]>([])
const vehicles = ref<RegisteredVehicle[]>([])
const failedImages = ref(new Set<number>())

const eventPage = ref(1)
const eventPageSize = 30
const eventFilters = reactive({ plate: '', gateId: '', direction: '', start: '', end: '' })
const sessionStatus = ref<'open' | 'closed' | 'all'>('open')
const vehicleQuery = ref('')
const vehicleModalOpen = ref(false)
const editingVehicleId = ref<number | null>(null)
const vehicleSaving = ref(false)

const emptyVehicle = (): VehiclePayload => ({
  plate: '',
  owner: '',
  department: '',
  phone: '',
  vehicle_type: '内部车辆',
  valid_from: null,
  valid_until: null,
  enabled: true,
  note: '',
})
const vehicleForm = reactive<VehiclePayload>(emptyVehicle())

const navigation = [
  { id: 'overview' as const, label: '运行总览', icon: markRaw(LayoutDashboard) },
  { id: 'events' as const, label: '进出记录', icon: markRaw(ListChecks) },
  { id: 'onsite' as const, label: '场内车辆', icon: markRaw(CircleParking) },
  { id: 'vehicles' as const, label: '车辆档案', icon: markRaw(UsersRound), admin: true },
  { id: 'gates' as const, label: '通道设备', icon: markRaw(RadioTower) },
]

const pageTitle = computed(
  () => navigation.find((item) => item.id === activeTab.value)?.label ?? '运行总览',
)
const totalEventPages = computed(() => Math.max(1, Math.ceil(eventTotal.value / eventPageSize)))
const onlineRate = computed(() => {
  const total = gates.value.length
  return total > 0
    ? Math.round((gates.value.filter((gate) => gate.online).length / total) * 100)
    : 0
})

let timer: number | undefined
let toastTimer: number | undefined

const formatError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (error.code === 'ECONNABORTED') return '请求超时，请检查服务或设备网络'
  }
  return error instanceof Error ? error.message : '操作失败'
}

const notify = (text: string, kind: 'success' | 'error' = 'success') => {
  toast.value = { text, kind }
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = null), 3000)
}

const toApiTime = (value: string) => (value ? value.replace('T', ' ') + ':00' : '')

const formatDuration = (entryTime: string) => {
  const start = new Date(entryTime.replace(' ', 'T') + '+08:00').getTime()
  const minutes = Math.max(0, Math.floor((Date.now() - start) / 60_000))
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return `${hours}小时${rest}分`
  return `${Math.floor(hours / 24)}天${hours % 24}小时`
}

const markImageFailed = (eventId: number) => {
  const next = new Set(failedImages.value)
  next.add(eventId)
  failedImages.value = next
}

const loadOverview = async () => {
  const [statsData, gatesData, eventsData, sessionsData] = await Promise.all([
    getParkingStats(),
    getParkingGates(),
    getParkingEvents({ limit: 12 }),
    getParkingSessions('open'),
  ])
  stats.value = statsData
  gates.value = gatesData.items
  latestEvents.value = eventsData.items
  sessions.value = sessionsData.items
}

const loadEvents = async () => {
  const data = await getParkingEvents({
    limit: eventPageSize,
    offset: (eventPage.value - 1) * eventPageSize,
    plate: eventFilters.plate.trim(),
    gate_id: eventFilters.gateId,
    direction: eventFilters.direction,
    start: toApiTime(eventFilters.start),
    end: toApiTime(eventFilters.end),
  })
  eventRows.value = data.items
  eventTotal.value = data.total
}

const loadSessions = async () => {
  sessions.value = (await getParkingSessions(sessionStatus.value)).items
}

const setSessionStatus = (status: 'open' | 'closed' | 'all') => {
  sessionStatus.value = status
  void loadSessions()
}

const loadVehicles = async () => {
  vehicles.value = (await getRegisteredVehicles(vehicleQuery.value.trim())).items
}

const loadGates = async () => {
  gates.value = (await getParkingGates()).items
}

const refreshCurrent = async (quiet = false) => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    if (activeTab.value === 'overview') await loadOverview()
    if (activeTab.value === 'events') await loadEvents()
    if (activeTab.value === 'onsite') await loadSessions()
    if (activeTab.value === 'vehicles' && loggedIn.value) await loadVehicles()
    if (activeTab.value === 'gates') await loadGates()
    if (!quiet) notify('数据已刷新')
  } catch (error) {
    if (!quiet) notify(formatError(error), 'error')
  } finally {
    refreshing.value = false
  }
}

const selectTab = async (tab: TabId, admin = false) => {
  sidebarOpen.value = false
  if (admin && !loggedIn.value) {
    pendingTab.value = tab
    loginOpen.value = true
    return
  }
  activeTab.value = tab
  await refreshCurrent(true)
}

const submitLogin = async () => {
  loginBusy.value = true
  loginError.value = ''
  try {
    const result = await loginParking(loginForm.username.trim(), loginForm.password)
    loggedIn.value = true
    currentUser.value = result.username
    loginForm.password = ''
    loginOpen.value = false
    notify('管理员登录成功')
    if (pendingTab.value) {
      const tab = pendingTab.value
      pendingTab.value = null
      await selectTab(tab)
    }
  } catch (error) {
    loginError.value = formatError(error)
  } finally {
    loginBusy.value = false
  }
}

const logout = () => {
  clearParkingToken()
  loggedIn.value = false
  currentUser.value = ''
  if (activeTab.value === 'vehicles') void selectTab('overview')
  notify('已退出管理员模式')
}

const requestAdmin = () => {
  loginOpen.value = true
  loginError.value = ''
}

const syncGate = async (gate: ParkingGate) => {
  if (!loggedIn.value) return requestAdmin()
  try {
    const result = await syncParkingGate(gate.id)
    notify(
      result.inserted > 0 ? `同步完成，新增 ${result.inserted} 条记录` : '同步完成，暂无新记录',
    )
    await loadGates()
  } catch (error) {
    notify(formatError(error), 'error')
  }
}

const openGate = async (gate: ParkingGate) => {
  if (!loggedIn.value) return requestAdmin()
  if (!window.confirm(`确认远程开启“${gate.name}”道闸？`)) return
  try {
    await openParkingGate(gate.id)
    notify(`${gate.name}开闸命令已发送`)
  } catch (error) {
    notify(formatError(error), 'error')
  }
}

const resetEventFilters = () => {
  Object.assign(eventFilters, { plate: '', gateId: '', direction: '', start: '', end: '' })
  eventPage.value = 1
  void loadEvents()
}

const searchEvents = () => {
  eventPage.value = 1
  void refreshCurrent(true)
}

const changeEventPage = (page: number) => {
  eventPage.value = Math.min(totalEventPages.value, Math.max(1, page))
  void loadEvents()
}

const openVehicleForm = (vehicle?: RegisteredVehicle) => {
  editingVehicleId.value = vehicle?.id ?? null
  Object.assign(
    vehicleForm,
    vehicle
      ? {
          plate: vehicle.plate,
          owner: vehicle.owner,
          department: vehicle.department,
          phone: vehicle.phone,
          vehicle_type: vehicle.vehicle_type,
          valid_from: vehicle.valid_from,
          valid_until: vehicle.valid_until,
          enabled: Boolean(vehicle.enabled),
          note: vehicle.note,
        }
      : emptyVehicle(),
  )
  vehicleModalOpen.value = true
}

const saveVehicle = async () => {
  if (!vehicleForm.plate.trim()) return notify('请输入车牌号码', 'error')
  vehicleSaving.value = true
  try {
    if (editingVehicleId.value) {
      await updateRegisteredVehicle(editingVehicleId.value, { ...vehicleForm })
    } else {
      await createRegisteredVehicle({ ...vehicleForm })
    }
    vehicleModalOpen.value = false
    notify(editingVehicleId.value ? '车辆档案已更新' : '车辆档案已创建')
    await loadVehicles()
  } catch (error) {
    notify(formatError(error), 'error')
  } finally {
    vehicleSaving.value = false
  }
}

const removeVehicle = async (vehicle: RegisteredVehicle) => {
  if (!window.confirm(`确认删除车辆“${vehicle.plate}”？`)) return
  try {
    await deleteRegisteredVehicle(vehicle.id)
    notify('车辆档案已删除')
    await loadVehicles()
  } catch (error) {
    notify(formatError(error), 'error')
  }
}

onMounted(async () => {
  if (getParkingToken()) {
    try {
      const me = await getParkingMe()
      loggedIn.value = true
      currentUser.value = me.username
    } catch {
      clearParkingToken()
    }
  }
  await refreshCurrent(true)
  timer = window.setInterval(() => void refreshCurrent(true), 5_000)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="parking-shell">
    <aside class="parking-sidebar" :class="{ 'parking-sidebar--open': sidebarOpen }">
      <div class="parking-brand">
        <div class="parking-brand__mark"><CarFront :size="24" /></div>
        <div>
          <strong>南钢智慧停车</strong>
          <span>车辆管控子系统</span>
        </div>
        <button class="icon-button sidebar-close" title="关闭菜单" @click="sidebarOpen = false">
          <X :size="20" />
        </button>
      </div>

      <nav class="parking-nav" aria-label="车辆管理导航">
        <button
          v-for="item in navigation"
          :key="item.id"
          :class="{ active: activeTab === item.id }"
          @click="selectTab(item.id, item.admin)"
        >
          <component :is="item.icon" :size="19" />
          <span>{{ item.label }}</span>
          <ShieldCheck v-if="item.admin && !loggedIn" class="admin-mark" :size="14" />
        </button>
      </nav>

      <div class="parking-sidebar__footer">
        <div class="service-indicator">
          <span :class="stats ? 'online' : 'offline'"></span>
          <div>
            <strong>{{ stats ? '停车服务在线' : '停车服务离线' }}</strong>
            <small>{{ stats?.summary.online_gates ?? 0 }}/10 通道在线</small>
          </div>
        </div>
        <button class="back-button" @click="router.push('/cockpit')">
          <ArrowLeft :size="17" /> 返回综合大屏
        </button>
      </div>
    </aside>

    <div class="parking-workspace">
      <header class="parking-header">
        <div class="parking-header__title">
          <button class="icon-button menu-button" title="打开菜单" @click="sidebarOpen = true">
            <Menu :size="21" />
          </button>
          <div>
            <h1>{{ pageTitle }}</h1>
            <p>{{ new Date().toLocaleDateString('zh-CN', { dateStyle: 'long' }) }}</p>
          </div>
        </div>
        <div class="parking-header__actions">
          <button
            class="icon-button"
            title="刷新数据"
            :disabled="refreshing"
            @click="refreshCurrent()"
          >
            <RefreshCw :size="19" :class="{ spinning: refreshing }" />
          </button>
          <button v-if="!loggedIn" class="text-button" @click="requestAdmin">
            <LogIn :size="17" /> 管理员登录
          </button>
          <div v-else class="user-menu">
            <UserRound :size="18" />
            <span>{{ currentUser }}</span>
            <button class="icon-button" title="退出登录" @click="logout">
              <LogOut :size="17" />
            </button>
          </div>
        </div>
      </header>

      <main class="parking-main">
        <template v-if="activeTab === 'overview'">
          <section class="stat-grid" aria-label="今日车辆统计">
            <article class="stat-item stat-item--green">
              <div class="stat-item__icon"><ArrowDownToLine :size="22" /></div>
              <div>
                <span>今日进场</span><strong>{{ stats?.summary.entries ?? 0 }}</strong
                ><small>辆</small>
              </div>
            </article>
            <article class="stat-item stat-item--orange">
              <div class="stat-item__icon"><ArrowUpFromLine :size="22" /></div>
              <div>
                <span>今日出场</span><strong>{{ stats?.summary.exits ?? 0 }}</strong
                ><small>辆</small>
              </div>
            </article>
            <article class="stat-item stat-item--blue">
              <div class="stat-item__icon"><CircleParking :size="22" /></div>
              <div>
                <span>当前在场</span><strong>{{ stats?.summary.inside ?? 0 }}</strong
                ><small>辆</small>
              </div>
            </article>
            <article class="stat-item stat-item--charcoal">
              <div class="stat-item__icon"><RadioTower :size="22" /></div>
              <div>
                <span>设备在线</span><strong>{{ onlineRate }}</strong
                ><small>%</small>
              </div>
            </article>
          </section>

          <section class="overview-columns">
            <div class="content-section">
              <div class="section-heading">
                <div>
                  <h2>通道运行状态</h2>
                  <p>5 个门区，10 个进出通道</p>
                </div>
                <span class="summary-badge">{{ stats?.summary.online_gates ?? 0 }} 在线</span>
              </div>
              <div class="gate-list gate-list--compact">
                <article v-for="gate in gates" :key="gate.id" class="gate-row">
                  <div class="gate-row__status" :class="gate.online ? 'online' : 'offline'"></div>
                  <div class="gate-row__name">
                    <strong>{{ gate.name }}</strong
                    ><span>{{ gate.ip }}</span>
                  </div>
                  <span class="direction-tag" :class="gate.direction">
                    {{ gate.direction === 'in' ? '入口' : '出口' }}
                  </span>
                  <time>{{ gate.last_event_at?.slice(11) || '--:--:--' }}</time>
                </article>
              </div>
            </div>

            <div class="content-section onsite-summary">
              <div class="section-heading">
                <div>
                  <h2>场内概况</h2>
                  <p>基于车牌进出记录自动配对</p>
                </div>
                <CarFront :size="22" />
              </div>
              <div class="capacity-meter">
                <div class="capacity-meter__head">
                  <span>车位使用</span>
                  <strong
                    >{{ stats?.summary.inside ?? 0 }} /
                    {{
                      (stats?.summary.inside ?? 0) + (stats?.summary.remaining_spaces ?? 0)
                    }}</strong
                  >
                </div>
                <div class="capacity-meter__track">
                  <span
                    :style="{
                      width: `${Math.min(100, ((stats?.summary.inside ?? 0) / Math.max(1, (stats?.summary.inside ?? 0) + (stats?.summary.remaining_spaces ?? 0))) * 100)}%`,
                    }"
                  ></span>
                </div>
              </div>
              <dl class="overview-metrics">
                <div>
                  <dt>剩余车位</dt>
                  <dd>{{ stats?.summary.remaining_spaces ?? 0 }}</dd>
                </div>
                <div>
                  <dt>未登记通行</dt>
                  <dd>{{ stats?.summary.unregistered_events ?? 0 }}</dd>
                </div>
                <div>
                  <dt>设备离线</dt>
                  <dd :class="{ warning: (stats?.summary.offline_gates ?? 0) > 0 }">
                    {{ stats?.summary.offline_gates ?? 0 }}
                  </dd>
                </div>
              </dl>
              <button class="secondary-button full-button" @click="selectTab('onsite')">
                查看场内车辆
              </button>
            </div>
          </section>

          <section class="content-section latest-section">
            <div class="section-heading">
              <div>
                <h2>最新通行记录</h2>
                <p>相机每 5 秒自动同步</p>
              </div>
              <button class="link-button" @click="selectTab('events')">
                查看全部 <ChevronRight :size="16" />
              </button>
            </div>
            <div class="record-strip">
              <article
                v-for="event in latestEvents.slice(0, 6)"
                :key="event.id"
                class="record-card"
              >
                <div class="record-card__image">
                  <Camera :size="22" />
                  <img
                    v-if="event.image_path && !failedImages.has(event.id)"
                    :src="parkingImageUrl(event.id)"
                    :alt="`${event.plate}抓拍`"
                    @error="markImageFailed(event.id)"
                  />
                </div>
                <div class="record-card__body">
                  <div>
                    <strong>{{ event.plate }}</strong
                    ><span :class="['direction-pill', event.direction]">{{
                      event.direction === 'in' ? '进场' : '出场'
                    }}</span>
                  </div>
                  <p>{{ event.gate_name }} · {{ event.captured_at }}</p>
                </div>
              </article>
              <div v-if="latestEvents.length === 0" class="empty-state">
                <Camera :size="30" /><span>暂无通行记录</span>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'events'">
          <section class="filter-bar">
            <label class="search-field"
              ><Search :size="17" /><input
                v-model="eventFilters.plate"
                placeholder="搜索车牌"
                @keyup.enter="searchEvents"
            /></label>
            <select v-model="eventFilters.gateId">
              <option value="">全部通道</option>
              <option v-for="gate in gates" :key="gate.id" :value="gate.id">{{ gate.name }}</option>
            </select>
            <select v-model="eventFilters.direction">
              <option value="">全部方向</option>
              <option value="in">进场</option>
              <option value="out">出场</option>
            </select>
            <input v-model="eventFilters.start" type="datetime-local" title="开始时间" />
            <input v-model="eventFilters.end" type="datetime-local" title="结束时间" />
            <button class="primary-button" @click="searchEvents"><Search :size="17" /> 查询</button>
            <button class="secondary-button" @click="resetEventFilters">重置</button>
          </section>
          <section class="content-section table-section">
            <div class="section-heading">
              <div>
                <h2>通行记录</h2>
                <p>共 {{ eventTotal }} 条识别结果</p>
              </div>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>抓拍</th>
                    <th>车牌号码</th>
                    <th>方向</th>
                    <th>通道</th>
                    <th>识别时间</th>
                    <th>车辆归属</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="event in eventRows" :key="event.id">
                    <td>
                      <div class="table-image">
                        <Camera :size="18" /><img
                          v-if="event.image_path && !failedImages.has(event.id)"
                          :src="parkingImageUrl(event.id)"
                          :alt="event.plate"
                          @error="markImageFailed(event.id)"
                        />
                      </div>
                    </td>
                    <td>
                      <strong class="plate-number">{{ event.plate }}</strong
                      ><small>{{ event.plate_color }}</small>
                    </td>
                    <td>
                      <span :class="['direction-pill', event.direction]">{{
                        event.direction === 'in' ? '进场' : '出场'
                      }}</span>
                    </td>
                    <td>{{ event.gate_name }}</td>
                    <td>{{ event.captured_at }}</td>
                    <td>
                      <span v-if="event.vehicle_id">{{
                        event.owner || event.department || event.registered_type
                      }}</span
                      ><span v-else class="muted">未登记</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="eventRows.length === 0" class="empty-state">
                <ListChecks :size="30" /><span>没有符合条件的记录</span>
              </div>
            </div>
            <div class="pagination">
              <span>第 {{ eventPage }} / {{ totalEventPages }} 页</span
              ><button
                class="icon-button"
                title="上一页"
                :disabled="eventPage <= 1"
                @click="changeEventPage(eventPage - 1)"
              >
                <ChevronLeft :size="18" /></button
              ><button
                class="icon-button"
                title="下一页"
                :disabled="eventPage >= totalEventPages"
                @click="changeEventPage(eventPage + 1)"
              >
                <ChevronRight :size="18" />
              </button>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'onsite'">
          <section class="toolbar-row">
            <div class="segmented-control">
              <button
                :class="{ active: sessionStatus === 'open' }"
                @click="setSessionStatus('open')"
              >
                当前在场</button
              ><button
                :class="{ active: sessionStatus === 'closed' }"
                @click="setSessionStatus('closed')"
              >
                已离场</button
              ><button
                :class="{ active: sessionStatus === 'all' }"
                @click="setSessionStatus('all')"
              >
                全部
              </button>
            </div>
            <span>{{ sessions.length }} 辆</span>
          </section>
          <section class="content-section table-section">
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>车牌号码</th>
                    <th>状态</th>
                    <th>入场通道</th>
                    <th>入场时间</th>
                    <th>停留时长</th>
                    <th>车辆归属</th>
                    <th>出场信息</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="session in sessions" :key="session.id">
                    <td>
                      <strong class="plate-number">{{ session.plate }}</strong>
                    </td>
                    <td>
                      <span :class="['session-status', session.status]">{{
                        session.status === 'open' ? '在场' : '已离场'
                      }}</span>
                    </td>
                    <td>{{ session.entry_gate_name }}</td>
                    <td>{{ session.entry_time }}</td>
                    <td>
                      {{ session.status === 'open' ? formatDuration(session.entry_time) : '-' }}
                    </td>
                    <td>{{ session.owner || session.department || '未登记' }}</td>
                    <td>
                      {{
                        session.exit_gate_name
                          ? `${session.exit_gate_name} · ${session.exit_time}`
                          : '-'
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="sessions.length === 0" class="empty-state">
                <CircleParking :size="30" /><span>暂无车辆数据</span>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'vehicles'">
          <section class="toolbar-row vehicle-toolbar">
            <label class="search-field"
              ><Search :size="17" /><input
                v-model="vehicleQuery"
                placeholder="搜索车牌、车主或部门"
                @keyup.enter="loadVehicles"
            /></label>
            <button class="primary-button" @click="openVehicleForm()">
              <Plus :size="17" /> 新增车辆
            </button>
          </section>
          <section class="content-section table-section">
            <div class="section-heading">
              <div>
                <h2>车辆档案</h2>
                <p>共 {{ vehicles.length }} 辆登记车辆</p>
              </div>
            </div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>车牌号码</th>
                    <th>车主</th>
                    <th>所属部门</th>
                    <th>联系电话</th>
                    <th>车辆类型</th>
                    <th>有效期</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="vehicle in vehicles" :key="vehicle.id">
                    <td>
                      <strong class="plate-number">{{ vehicle.plate }}</strong>
                    </td>
                    <td>{{ vehicle.owner || '-' }}</td>
                    <td>{{ vehicle.department || '-' }}</td>
                    <td>{{ vehicle.phone || '-' }}</td>
                    <td>{{ vehicle.vehicle_type }}</td>
                    <td>{{ vehicle.valid_until || '长期' }}</td>
                    <td>
                      <span :class="['session-status', vehicle.enabled ? 'open' : 'closed']">{{
                        vehicle.enabled ? '启用' : '停用'
                      }}</span>
                    </td>
                    <td>
                      <div class="table-actions">
                        <button
                          class="icon-button"
                          title="编辑车辆"
                          @click="openVehicleForm(vehicle)"
                        >
                          <Pencil :size="16" /></button
                        ><button
                          class="icon-button danger"
                          title="删除车辆"
                          @click="removeVehicle(vehicle)"
                        >
                          <Trash2 :size="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="vehicles.length === 0" class="empty-state">
                <UsersRound :size="30" /><span>暂无车辆档案</span>
              </div>
            </div>
          </section>
        </template>

        <template v-else-if="activeTab === 'gates'">
          <section class="gate-page-summary">
            <div>
              <span>在线通道</span><strong>{{ gates.filter((gate) => gate.online).length }}</strong>
            </div>
            <div>
              <span>离线通道</span
              ><strong class="warning">{{ gates.filter((gate) => !gate.online).length }}</strong>
            </div>
            <div>
              <span>设备总数</span><strong>{{ gates.length }}</strong>
            </div>
          </section>
          <section class="gate-grid">
            <article v-for="gate in gates" :key="gate.id" class="gate-card">
              <div class="gate-card__head">
                <div class="gate-card__icon" :class="gate.online ? 'online' : 'offline'">
                  <RadioTower :size="21" />
                </div>
                <div>
                  <h2>{{ gate.name }}</h2>
                  <p>{{ gate.direction === 'in' ? '车辆入口' : '车辆出口' }}</p>
                </div>
                <span :class="['device-state', gate.online ? 'online' : 'offline']">{{
                  gate.online ? '在线' : '离线'
                }}</span>
              </div>
              <dl>
                <div>
                  <dt>设备地址</dt>
                  <dd>{{ gate.ip }}:80</dd>
                </div>
                <div>
                  <dt>设备类型</dt>
                  <dd>{{ gate.adapter === 'signalway' ? '信路威' : 'OEM IPNC' }}</dd>
                </div>
                <div>
                  <dt>最近识别</dt>
                  <dd>{{ gate.last_event_at || '暂无记录' }}</dd>
                </div>
                <div>
                  <dt>最近检测</dt>
                  <dd>{{ gate.last_poll_at || '等待检测' }}</dd>
                </div>
              </dl>
              <div v-if="gate.last_error" class="gate-error">
                <TriangleAlert :size="15" /><span>{{ gate.last_error }}</span>
              </div>
              <div class="gate-card__actions">
                <button class="secondary-button" @click="syncGate(gate)">
                  <RefreshCw :size="16" /> 立即同步</button
                ><button
                  v-if="gate.capabilities.manual_open"
                  class="primary-button"
                  @click="openGate(gate)"
                >
                  <DoorOpen :size="16" /> 远程开闸
                </button>
              </div>
            </article>
          </section>
        </template>
      </main>
    </div>

    <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

    <div v-if="loginOpen" class="modal-backdrop" @click.self="loginOpen = false">
      <form class="modal login-modal" @submit.prevent="submitLogin">
        <div class="modal__head">
          <div>
            <h2>管理员登录</h2>
            <p>管理车辆档案及通道控制</p>
          </div>
          <button type="button" class="icon-button" title="关闭" @click="loginOpen = false">
            <X :size="20" />
          </button>
        </div>
        <label>用户名<input v-model="loginForm.username" autocomplete="username" /></label>
        <label
          >密码<input
            v-model="loginForm.password"
            type="password"
            autocomplete="current-password"
            autofocus
        /></label>
        <p v-if="loginError" class="form-error">{{ loginError }}</p>
        <button class="primary-button full-button" :disabled="loginBusy">
          {{ loginBusy ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>

    <div v-if="vehicleModalOpen" class="modal-backdrop" @click.self="vehicleModalOpen = false">
      <form class="modal vehicle-modal" @submit.prevent="saveVehicle">
        <div class="modal__head">
          <div>
            <h2>{{ editingVehicleId ? '编辑车辆' : '新增车辆' }}</h2>
            <p>车辆档案与通行识别自动关联</p>
          </div>
          <button type="button" class="icon-button" title="关闭" @click="vehicleModalOpen = false">
            <X :size="20" />
          </button>
        </div>
        <div class="form-grid">
          <label>车牌号码<input v-model="vehicleForm.plate" required maxlength="16" /></label
          ><label
            >车辆类型<select v-model="vehicleForm.vehicle_type">
              <option>内部车辆</option>
              <option>访客车辆</option>
              <option>物流车辆</option>
              <option>特种车辆</option>
            </select></label
          ><label>车主姓名<input v-model="vehicleForm.owner" maxlength="40" /></label
          ><label>联系电话<input v-model="vehicleForm.phone" maxlength="30" /></label
          ><label class="span-two"
            >所属部门<input v-model="vehicleForm.department" maxlength="80" /></label
          ><label>生效日期<input v-model="vehicleForm.valid_from" type="date" /></label
          ><label>失效日期<input v-model="vehicleForm.valid_until" type="date" /></label
          ><label class="span-two"
            >备注<textarea v-model="vehicleForm.note" rows="3" maxlength="200"></textarea>
          </label>
        </div>
        <label class="toggle-row"
          ><input v-model="vehicleForm.enabled" type="checkbox" /><span>启用车辆档案</span></label
        >
        <div class="modal__actions">
          <button type="button" class="secondary-button" @click="vehicleModalOpen = false">
            取消</button
          ><button class="primary-button" :disabled="vehicleSaving">
            {{ vehicleSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </form>
    </div>

    <Transition name="toast"
      ><div v-if="toast" :class="['toast', toast.kind]">{{ toast.text }}</div></Transition
    >
  </div>
</template>

<style scoped>
.parking-shell {
  --green: #16845b;
  --green-dark: #0f6847;
  --ink: #1e2724;
  --muted: #66736e;
  --line: #dde4e0;
  --surface: #fff;
  min-height: 100vh;
  display: flex;
  color: var(--ink);
  background: #f3f5f4;
  font-family: Inter, 'Microsoft YaHei', sans-serif;
}
button,
input,
select,
textarea {
  font: inherit;
}
button {
  cursor: pointer;
}
.parking-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  width: 232px;
  display: flex;
  flex-direction: column;
  background: #202b27;
  color: #fff;
}
.parking-brand {
  height: 76px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.parking-brand__mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: none;
  color: #fff;
  background: var(--green);
  border-radius: 6px;
}
.parking-brand strong,
.parking-brand span {
  display: block;
  letter-spacing: 0;
}
.parking-brand strong {
  font-size: 16px;
  font-weight: 650;
}
.parking-brand span {
  margin-top: 2px;
  color: #aebcb6;
  font-size: 12px;
}
.parking-nav {
  padding: 16px 10px;
  display: grid;
  gap: 4px;
}
.parking-nav button {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  border: 0;
  border-radius: 5px;
  color: #b9c5c0;
  background: transparent;
  text-align: left;
}
.parking-nav button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
}
.parking-nav button.active {
  color: #fff;
  background: var(--green);
}
.parking-nav span {
  flex: 1;
}
.admin-mark {
  opacity: 0.65;
}
.parking-sidebar__footer {
  margin-top: auto;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.service-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.service-indicator > span {
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
}
.service-indicator > span.online {
  background: #43d69c;
  box-shadow: 0 0 0 4px rgba(67, 214, 156, 0.12);
}
.service-indicator > span.offline {
  background: #ef7468;
}
.service-indicator strong,
.service-indicator small {
  display: block;
}
.service-indicator strong {
  font-size: 13px;
  font-weight: 600;
}
.service-indicator small {
  color: #9caca5;
  font-size: 11px;
}
.back-button {
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 5px;
  color: #d5ded9;
  background: transparent;
}
.parking-workspace {
  width: calc(100% - 232px);
  min-width: 0;
  margin-left: 232px;
}
.parking-header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
}
.parking-header__title,
.parking-header__actions,
.user-menu {
  display: flex;
  align-items: center;
}
.parking-header__title {
  gap: 12px;
}
.parking-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 680;
  letter-spacing: 0;
  line-height: 1.3;
}
.parking-header p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.parking-header__actions {
  gap: 10px;
}
.user-menu {
  height: 38px;
  gap: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--line);
  color: #43504a;
}
.icon-button {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: #52605a;
  background: #fff;
}
.icon-button:hover {
  border-color: #b8c7c0;
  color: var(--green);
}
.icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
.icon-button.danger:hover {
  color: #c13d34;
  border-color: #e8b4b0;
}
.menu-button,
.sidebar-close {
  display: none;
}
.text-button,
.primary-button,
.secondary-button,
.link-button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 5px;
  font-weight: 600;
  white-space: nowrap;
}
.text-button,
.primary-button {
  border: 1px solid var(--green);
  color: #fff;
  background: var(--green);
}
.text-button:hover,
.primary-button:hover {
  background: var(--green-dark);
}
.secondary-button {
  border: 1px solid #cbd5d0;
  color: #43504a;
  background: #fff;
}
.secondary-button:hover {
  border-color: #9caea5;
  color: var(--green-dark);
}
.link-button {
  padding: 0;
  border: 0;
  color: var(--green);
  background: transparent;
}
.full-button {
  width: 100%;
}
.parking-main {
  max-width: 1520px;
  margin: 0 auto;
  padding: 24px 28px 40px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}
.stat-item {
  min-height: 114px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}
.stat-item__icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 6px;
}
.stat-item span,
.stat-item strong {
  display: block;
}
.stat-item span {
  color: var(--muted);
  font-size: 13px;
}
.stat-item strong {
  display: inline;
  margin-right: 5px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-item small {
  color: var(--muted);
}
.stat-item--green .stat-item__icon {
  color: #147653;
  background: #e2f3ec;
}
.stat-item--orange .stat-item__icon {
  color: #b05e19;
  background: #fff0de;
}
.stat-item--blue .stat-item__icon {
  color: #276895;
  background: #e4f1f8;
}
.stat-item--charcoal .stat-item__icon {
  color: #44514b;
  background: #e9edeb;
}
.overview-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(300px, 0.8fr);
  gap: 20px;
  margin-bottom: 20px;
}
.content-section {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}
.section-heading {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid #e8ecea;
}
.section-heading h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 680;
  letter-spacing: 0;
}
.section-heading p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.summary-badge {
  padding: 3px 8px;
  border-radius: 4px;
  color: #147653;
  background: #e2f3ec;
  font-size: 12px;
  font-weight: 650;
}
.gate-list--compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 8px 14px 14px;
}
.gate-row {
  min-width: 0;
  height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-bottom: 1px solid #edf0ee;
}
.gate-row__status {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
}
.gate-row__status.online {
  background: #24a777;
}
.gate-row__status.offline {
  background: #d65349;
}
.gate-row__name {
  min-width: 0;
  flex: 1;
}
.gate-row__name strong,
.gate-row__name span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gate-row__name strong {
  font-size: 13px;
  font-weight: 620;
}
.gate-row__name span {
  color: var(--muted);
  font-size: 11px;
}
.gate-row time {
  width: 58px;
  color: var(--muted);
  font-size: 11px;
}
.direction-tag,
.direction-pill,
.session-status,
.device-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 650;
}
.direction-tag {
  width: 38px;
  height: 22px;
}
.direction-tag.in,
.direction-pill.in {
  color: #117350;
  background: #e0f2ea;
}
.direction-tag.out,
.direction-pill.out {
  color: #a24f16;
  background: #ffedd9;
}
.onsite-summary {
  padding-bottom: 16px;
}
.onsite-summary .section-heading {
  border-bottom: 0;
}
.capacity-meter {
  padding: 10px 18px 16px;
}
.capacity-meter__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 12px;
}
.capacity-meter__head strong {
  color: var(--ink);
}
.capacity-meter__track {
  height: 8px;
  overflow: hidden;
  border-radius: 3px;
  background: #e8edeb;
}
.capacity-meter__track span {
  display: block;
  height: 100%;
  background: var(--green);
}
.overview-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: 0 18px 18px;
  border: 1px solid #e7ebe9;
  border-radius: 5px;
}
.overview-metrics div {
  padding: 10px;
  text-align: center;
  border-right: 1px solid #e7ebe9;
}
.overview-metrics div:last-child {
  border: 0;
}
.overview-metrics dt {
  color: var(--muted);
  font-size: 11px;
}
.overview-metrics dd {
  margin: 2px 0 0;
  font-size: 18px;
  font-weight: 700;
}
.warning {
  color: #c23e36 !important;
}
.onsite-summary .full-button {
  width: calc(100% - 36px);
  margin: 0 18px;
}
.latest-section {
  overflow: hidden;
}
.record-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
}
.record-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #e2e7e4;
  border-radius: 5px;
}
.record-card__image {
  position: relative;
  height: 70px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #95a39c;
  background: #e7ece9;
}
.record-card__image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.record-card__body {
  min-width: 0;
  padding: 10px;
}
.record-card__body > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}
.record-card__body strong {
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-card__body p {
  margin: 7px 0 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.direction-pill {
  min-width: 40px;
  height: 22px;
  padding: 0 6px;
}
.filter-bar,
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.filter-bar {
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}
input,
select,
textarea {
  min-width: 0;
  border: 1px solid #cdd7d2;
  border-radius: 4px;
  color: var(--ink);
  background: #fff;
  outline: none;
}
input,
select {
  height: 36px;
  padding: 0 10px;
}
input:focus,
select:focus,
textarea:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(22, 132, 91, 0.1);
}
.search-field {
  min-width: 210px;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #cdd7d2;
  border-radius: 4px;
  background: #fff;
}
.search-field:focus-within {
  border-color: var(--green);
}
.search-field input {
  height: 32px;
  flex: 1;
  padding: 0;
  border: 0;
  box-shadow: none;
}
.table-section {
  overflow: hidden;
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}
th,
td {
  height: 58px;
  padding: 8px 14px;
  border-bottom: 1px solid #e9edeb;
  text-align: left;
  vertical-align: middle;
}
th {
  height: 42px;
  color: #68756f;
  background: #f7f9f8;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}
td {
  color: #394640;
  font-size: 13px;
}
tbody tr:hover {
  background: #f8faf9;
}
td small {
  display: block;
  color: var(--muted);
  font-size: 10px;
}
.table-image {
  position: relative;
  width: 76px;
  height: 46px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 4px;
  color: #94a199;
  background: #e7ece9;
}
.table-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.plate-number {
  font-weight: 720;
  letter-spacing: 0;
  white-space: nowrap;
}
.muted {
  color: #929d98;
}
.pagination {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 14px;
}
.pagination span {
  margin-right: 5px;
  color: var(--muted);
  font-size: 12px;
}
.empty-state {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8e9b95;
  font-size: 13px;
}
.record-strip > .empty-state {
  grid-column: 1 / -1;
}
.toolbar-row {
  justify-content: space-between;
}
.toolbar-row > span {
  color: var(--muted);
  font-size: 13px;
}
.segmented-control {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #fff;
}
.segmented-control button {
  min-width: 78px;
  height: 30px;
  border: 0;
  border-radius: 3px;
  color: var(--muted);
  background: transparent;
}
.segmented-control button.active {
  color: #fff;
  background: var(--green);
}
.session-status {
  min-width: 42px;
  height: 23px;
  padding: 0 7px;
}
.session-status.open {
  color: #117350;
  background: #e0f2ea;
}
.session-status.closed {
  color: #68756f;
  background: #e9edeb;
}
.vehicle-toolbar .search-field {
  width: min(360px, 100%);
}
.table-actions {
  display: flex;
  gap: 6px;
}
.gate-page-summary {
  display: flex;
  gap: 1px;
  margin-bottom: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--line);
}
.gate-page-summary div {
  min-width: 150px;
  flex: 1;
  padding: 16px 20px;
  background: #fff;
}
.gate-page-summary span {
  display: block;
  color: var(--muted);
  font-size: 12px;
}
.gate-page-summary strong {
  font-size: 25px;
  font-weight: 700;
}
.gate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.gate-card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #fff;
}
.gate-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e8ecea;
}
.gate-card__icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: none;
  border-radius: 5px;
}
.gate-card__icon.online {
  color: #147653;
  background: #e2f3ec;
}
.gate-card__icon.offline {
  color: #b83f37;
  background: #f9e5e3;
}
.gate-card__head > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}
.gate-card h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 680;
}
.gate-card p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 11px;
}
.device-state {
  min-width: 44px;
  height: 24px;
}
.device-state.online {
  color: #117350;
  background: #e0f2ea;
}
.device-state.offline {
  color: #b83f37;
  background: #f9e5e3;
}
.gate-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px 20px;
  margin: 16px 0;
}
.gate-card dt {
  color: var(--muted);
  font-size: 11px;
}
.gate-card dd {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 12px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gate-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  padding: 8px;
  color: #a43b34;
  background: #fbebea;
  border-radius: 4px;
  font-size: 11px;
}
.gate-error span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gate-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.modal-backdrop,
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(20, 27, 24, 0.48);
}
.modal-backdrop {
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal {
  width: min(460px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 22px;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(22, 31, 27, 0.2);
}
.vehicle-modal {
  width: min(680px, 100%);
}
.modal__head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}
.modal__head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 680;
}
.modal__head p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.modal > label,
.form-grid label {
  display: grid;
  gap: 5px;
  margin-bottom: 13px;
  color: #4c5953;
  font-size: 12px;
  font-weight: 600;
}
.modal input,
.modal select {
  width: 100%;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 14px;
}
.form-grid .span-two {
  grid-column: 1 / -1;
}
textarea {
  width: 100%;
  resize: vertical;
  padding: 8px 10px;
}
.toggle-row {
  display: flex !important;
  grid-template-columns: none !important;
  align-items: center;
  gap: 8px !important;
}
.toggle-row input {
  width: 16px;
  height: 16px;
}
.form-error {
  margin: -4px 0 12px;
  color: #bd3d35;
  font-size: 12px;
}
.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  max-width: min(380px, calc(100vw - 48px));
  padding: 11px 15px;
  border-radius: 5px;
  color: #fff;
  background: #26332d;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.18);
  font-size: 13px;
}
.toast.error {
  background: #aa3d36;
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .overview-columns {
    grid-template-columns: 1fr;
  }
  .record-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 820px) {
  .parking-sidebar {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }
  .parking-sidebar--open {
    transform: translateX(0);
  }
  .sidebar-close,
  .menu-button {
    display: inline-grid;
  }
  .sidebar-close {
    margin-left: auto;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.16);
    background: transparent;
  }
  .sidebar-backdrop {
    z-index: 25;
  }
  .parking-workspace {
    width: 100%;
    margin-left: 0;
  }
  .parking-header {
    padding: 0 16px;
  }
  .parking-main {
    padding: 18px 16px 32px;
  }
  .gate-list--compact,
  .gate-grid {
    grid-template-columns: 1fr;
  }
  .parking-header p {
    display: none;
  }
}
@media (max-width: 600px) {
  .parking-header {
    height: 66px;
  }
  .parking-header h1 {
    font-size: 17px;
  }
  .parking-header__actions > .icon-button {
    display: none;
  }
  .text-button {
    width: 36px;
    padding: 0;
    font-size: 0;
  }
  .text-button svg {
    width: 18px;
  }
  .user-menu > span {
    display: none;
  }
  .parking-main {
    padding: 14px 12px 28px;
  }
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .stat-item {
    min-height: 94px;
    gap: 10px;
    padding: 12px;
  }
  .stat-item__icon {
    width: 36px;
    height: 36px;
  }
  .stat-item strong {
    font-size: 23px;
  }
  .record-strip {
    grid-template-columns: 1fr;
  }
  .overview-metrics {
    grid-template-columns: 1fr;
  }
  .overview-metrics div {
    display: flex;
    justify-content: space-between;
    border-right: 0;
    border-bottom: 1px solid #e7ebe9;
  }
  .filter-bar > *,
  .filter-bar .search-field,
  .vehicle-toolbar .search-field {
    width: 100%;
  }
  .toolbar-row {
    align-items: stretch;
    flex-direction: column;
  }
  .segmented-control {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
  .gate-page-summary div {
    min-width: 0;
    padding: 12px;
  }
  .gate-page-summary strong {
    font-size: 21px;
  }
  .gate-card dl,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .form-grid .span-two {
    grid-column: auto;
  }
  .modal {
    padding: 18px;
  }
}
</style>
