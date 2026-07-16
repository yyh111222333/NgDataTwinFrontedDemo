import axios from 'axios'
import type {
  AppointmentOptions,
  AppointmentRecord,
  PersonAppointmentPayload,
  VehicleAppointmentPayload,
} from '@/types/appointment'
import type { ListResponse } from '@/types/parking'

const client = axios.create({
  baseURL: '/parking-api/public/appointments',
  timeout: 25_000,
})

export async function getAppointmentOptions() {
  const { data } = await client.get<AppointmentOptions>('/options')
  return data
}

export async function getRecentAppointments(limit = 6) {
  const { data } = await client.get<ListResponse<AppointmentRecord>>('', { params: { limit } })
  return data
}

export async function createPersonAppointment(payload: PersonAppointmentPayload) {
  const { data } = await client.post<AppointmentRecord>('/person', payload)
  return data
}

export async function createVehicleAppointment(payload: VehicleAppointmentPayload) {
  const { data } = await client.post<AppointmentRecord>('/vehicle', payload)
  return data
}
