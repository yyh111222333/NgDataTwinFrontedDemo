export type AppointmentType = 'person' | 'vehicle'
export type AppointmentStatus = 'pending' | 'active' | 'failed' | 'cancelled' | 'expired'

export interface AppointmentDepartment {
  no: string
  name: string
}

export interface AppointmentDevice {
  no: string
  name: string
}

export interface AppointmentOptions {
  available: boolean
  mode: 'openapi' | 'portal'
  departments: AppointmentDepartment[]
  devices: AppointmentDevice[]
  default_department_no: string
  message?: string
}

export interface AppointmentRecord {
  id: number
  appointment_type: AppointmentType
  subject_name: string
  phone: string
  plate: string
  reason: string
  department_no: string
  device_nos: string[]
  valid_from: string
  valid_until: string
  external_id: string
  sync_status: AppointmentStatus
  sync_message: string
  created_at: string
  updated_at: string
}

export interface PersonAppointmentPayload {
  name: string
  phone: string
  reason: string
  department_no: string
  device_nos: string[]
  id_card: string
  sex: 0 | 1 | 2
  photo: string
  valid_from: string
  valid_until: string
}

export interface VehicleAppointmentPayload {
  name: string
  phone: string
  plate: string
  plate_color: 'auto' | 'blue' | 'yellow' | 'green'
  reason: string
  valid_from: string
  valid_until: string
}
