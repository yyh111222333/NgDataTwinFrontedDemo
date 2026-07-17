import axios from 'axios'
import type {
  ListResponse,
  ParkingEvent,
  ParkingGate,
  ParkingSession,
  ParkingStats,
  RegisteredVehicle,
  VehiclePayload,
} from '@/types/parking'

const TOKEN_KEY = 'nangang-parking-token'

const client = axios.create({
  baseURL: '/parking-api',
  timeout: 12_000,
})

client.interceptors.request.use((config) => {
  const token = getParkingToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getParkingToken = () => localStorage.getItem(TOKEN_KEY) ?? ''
export const setParkingToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const clearParkingToken = () => localStorage.removeItem(TOKEN_KEY)

export async function loginParking(username: string, password: string) {
  const { data } = await client.post<{ token: string; username: string }>('/auth/login', {
    username,
    password,
  })
  setParkingToken(data.token)
  return data
}

export async function getParkingMe() {
  const { data } = await client.get<{ username: string }>('/me')
  return data
}

export async function getParkingStats() {
  const { data } = await client.get<ParkingStats>('/public/stats')
  return data
}

export async function getParkingGates() {
  const { data } = await client.get<ListResponse<ParkingGate>>('/public/gates')
  return data
}

export async function syncParkingGate(gateId: string) {
  const { data } = await client.post<{ success: boolean; inserted: number }>(
    `/gates/${gateId}/sync`,
  )
  return data
}

export async function openParkingGate(gateId: string) {
  const { data } = await client.post<{ success: boolean; message: string }>(
    `/gates/${gateId}/open`,
    { confirmation: 'MANUAL_GATE_CONTROL' },
  )
  return data
}

export async function getParkingEvents(
  params: {
    limit?: number
    offset?: number
    plate?: string
    gate_id?: string
    direction?: string
    start?: string
    end?: string
  } = {},
) {
  const { data } = await client.get<ListResponse<ParkingEvent>>('/public/records', { params })
  return data
}

export async function getParkingSessions(sessionStatus: 'open' | 'closed' | 'all' = 'open') {
  const { data } = await client.get<ListResponse<ParkingSession>>('/public/sessions', {
    params: { session_status: sessionStatus },
  })
  return data
}

export async function getRegisteredVehicles(query = '') {
  const { data } = await client.get<ListResponse<RegisteredVehicle>>('/vehicles', {
    params: { query },
  })
  return data
}

export async function createRegisteredVehicle(payload: VehiclePayload) {
  const { data } = await client.post<RegisteredVehicle>('/vehicles', payload)
  return data
}

export async function updateRegisteredVehicle(id: number, payload: VehiclePayload) {
  const { data } = await client.put<RegisteredVehicle>(`/vehicles/${id}`, payload)
  return data
}

export async function syncRegisteredVehicle(id: number) {
  const { data } = await client.post<RegisteredVehicle>(`/vehicles/${id}/sync`)
  return data
}

export async function deleteRegisteredVehicle(id: number) {
  await client.delete(`/vehicles/${id}`)
}

export function parkingImageUrl(eventId: number) {
  return `/parking-api/public/events/${eventId}/image`
}
